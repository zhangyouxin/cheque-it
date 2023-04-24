
## Features

Here is a mindmap that outlines the features and functions of the cheque_It application:


- Home
    - connect wallet
    - show User NickName
    - disconnect
- Deposit
    - Balance
        - sudt balance
        - receive
            - choose an address from address book to receive
        - write a cheque
            - choose sudt
            - input deposit sudt amount
            - input receiver address
            - send tx
    - Deposit History(localStorage)
        - tx rejected
        - withdrawable
        - dead cell( only one deposit cell per tx )
- Collect
    - Claim
        - click “claim” button on card, then call wallet to sign
        - claim with signature/input
            - 🥺 The balance will be deduced by 142 ckbs  if receiver does not have this sUDT(must have enough balance)
            - if receiver has some this sUDT, push into that cell, and receiver only need to pay tx fee
    - withdraw
    
    Questions:
    
    1. 可以多个 address 的 cell 往某一个地址发送 cheque 吗？
        - 可以，只需要注意指定 sender， (cheque lock args 的后半段是 sender_lock_hash，无法恢复出 sender lock)
        - 这里可以做一个约定，create cheque tx 的 change cell 使用 sender lock，这样根绝 cheque 的 tx hash 就可以恢复出 sender lock 了
    2. 使用 cheque 签名解锁还是 inputs 里包含 receiver Cell 解锁
        - 使用签名解锁，后者要求 receiver 必须有 ckb 余额才行， 但目前 nexus 不给签名，所以需要使用 signData 为 cheque 签名，signTx 为支付手续费和创建用来接收 sudt 的 cell 的 inputs 签名
        - 但是目前可能只能用 inputs cell 解锁，因为 signData 有个 magic prefix， 而且就算signData没有 prefix ，那也需要签名两次
    3. [feature request for nexus]show pay fee in nexus
    4. [feature request for nexus]sign contract
    