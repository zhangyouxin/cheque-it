import { JSONRPCRequest, JSONRPCResponse } from 'json-rpc-2.0';
import { RPC as RpcType } from '@ckb-lumos/rpc/lib/types/rpc';
import pTimeout from 'p-timeout';
import pRetry from 'p-retry';
import { HexNumber, HexString, Script, OutPoint, Cell } from '@ckb-lumos/base';
import { ResolvableCell } from '../commons/types';

type Order = 'asc' | 'desc';
type Limit = HexNumber;
type CursorType = HexString | null;
type RpcQueryType = [
  {
    script: RpcType.Script;
    script_type: 'lock' | 'type';
    script_search_mode: 'exact' | 'prefix';
  },
  Order,
  Limit,
  CursorType?,
];

const toQueryParam = (payload: {
  lock: Script;
  cursor?: CursorType;
  order?: Order;
  limit?: HexNumber;
}): RpcQueryType => [
  {
    script: {
      code_hash: payload.lock.codeHash,
      hash_type: payload.lock.hashType,
      args: payload.lock.args,
    },
    script_type: 'lock',
    script_search_mode: 'exact',
  },
  payload.order ?? 'asc',
  payload.limit ?? '0x64',
  payload.cursor || null,
];

const toScript = (rpcScript: RpcType.Script): Script => ({
  codeHash: rpcScript.code_hash,
  hashType: rpcScript.hash_type,
  args: rpcScript.args,
});

const toOutPoint = (rpcOutPoint: RpcType.OutPoint): OutPoint => ({
  txHash: rpcOutPoint.tx_hash,
  index: rpcOutPoint.index,
});

const toCell = (rpcIndexerCell: RpcType.IndexerCell): ResolvableCell => ({
  cellOutput: {
    capacity: rpcIndexerCell.output.capacity,
    lock: toScript(rpcIndexerCell.output.lock),
    type: rpcIndexerCell.output.type ? toScript(rpcIndexerCell.output.type) : undefined,
  },
  data: rpcIndexerCell.output_data,
  outPoint: toOutPoint(rpcIndexerCell.out_point),
  blockNumber: rpcIndexerCell.block_number,
});

type RpcClient = {
  request: <Result = unknown, Params = unknown>(method: string, params: Params) => Promise<Result>;
  batchRequest: <Result = unknown, Params = unknown>(method: string, batchParams: Params[]) => Promise<Result[]>;
};

type RpcClientOptions = {
  timeout?: number; // in milliseconds
  maxRetries?: number;
};

function createRpcClient(url: string, options?: RpcClientOptions): RpcClient {
  // auto-increment id
  let jsonRpcId = 0;

  async function _request(body: JSONRPCRequest | JSONRPCRequest[]): Promise<JSONRPCResponse | JSONRPCResponse[]> {
    ++jsonRpcId;
    const retryRunner = async () => {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Abort retrying if the resource doesn't exist
      if (res.status >= 300) {
        /* istanbul ignore next */
        throw new Error(`Request failed with status code ${res.status}`);
      }
      return res.json();
    };

    const retryPromise = pRetry(retryRunner, { retries: options?.maxRetries || 5 });
    const res = await pTimeout(retryPromise, {
      milliseconds: options?.timeout || 10_000,
    });

    return res as Promise<JSONRPCResponse | JSONRPCResponse[]>;
  }

  async function request<Result = unknown, Params = unknown>(method: string, params: Params): Promise<Result> {
    const res = (await _request({ jsonrpc: '2.0', id: jsonRpcId, method: method, params: params })) as JSONRPCResponse;
    if (res.error !== undefined) {
      throw new Error(`Request failed with error: ${res.error.message}`);
    }
    return res.result;
  }

  async function batchRequest<Result = unknown, Params = unknown>(
    method: string,
    batchParams: Params[],
  ): Promise<Result[]> {
    const res = (await _request(
      batchParams.map((params) => ({
        jsonrpc: '2.0',
        id: jsonRpcId,
        method,
        params: params,
      })),
    )) as JSONRPCResponse[];

    return res.map<Result>((res) => {
      /* istanbul ignore if */
      if (res.error !== undefined) {
        throw new Error(`Request failed with error: ${res.error.message}`);
      }
      return res.result;
    });
  }

  return { request, batchRequest };
}

export { createRpcClient, toCell, toScript, toQueryParam };
