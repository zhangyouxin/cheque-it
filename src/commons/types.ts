import { Cell, Script } from '@ckb-lumos/base';

type ScriptArgs = string;

export type ScriptInfo = Script | ScriptArgs;

export type ResolvableCell = Omit<Required<Cell>, 'blockHash'>;
