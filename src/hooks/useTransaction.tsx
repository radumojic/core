/* eslint-disable react-hooks/exhaustive-deps */
import { useState } from 'react';
import {
  Address,
  Transaction,
  ITransactionPayload,
  IGasLimit,
  ITransactionValue,
  ITransactionOnNetwork,
} from '@multiversx/sdk-core';
import { useWebWalletTxSend } from './common-helpers/useWebWalletTxSend';
import {
  TransactionCallbackParams,
  signAndSendTxOperations,
} from './common-helpers/signAndSendTxOperations';
import { DappProvider } from '../types/network';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers/out';
import { useConfig } from './useConfig';
import { useLoginInfo } from './useLoginInfo';
import { useAccount } from './useAccount';
import { useNetwork } from './useNetwork';

interface TransactionParams {
  address: string;
  gasLimit: IGasLimit;
  data?: ITransactionPayload;
  value?: ITransactionValue;
}

export interface TransactionArgs {
  webWalletRedirectUrl?: string;
  cb?: (params: TransactionCallbackParams) => void;
}

export function useTransaction(
  { webWalletRedirectUrl, cb }: TransactionArgs = {
    webWalletRedirectUrl: undefined,
    cb: undefined,
  }
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [txResult, setTxResult] = useState<ITransactionOnNetwork | null>(null);
  const accountSnap = useAccount();
  const loginInfoSnap = useLoginInfo();
  const networkStateSnap = useNetwork();
  const configStateSnap = useConfig();

  const currentNonce = accountSnap.nonce;

  useWebWalletTxSend({ setPending, setTransaction, setTxResult, setError, cb });

  const triggerTx = async ({
    address,
    data,
    gasLimit,
    value,
  }: TransactionParams) => {
    setTransaction(null);
    setTxResult(null);
    setError('');

    if (
      networkStateSnap.dappProvider &&
      networkStateSnap.apiNetworkProvider &&
      currentNonce !== undefined &&
      accountSnap.address
    ) {
      setPending(true);
      cb?.({ pending: true });

      const sender = new Address(accountSnap.address);
      const activeGuardianAddress = accountSnap.activeGuardianAddress;

      const tx = new Transaction({
        nonce: currentNonce,
        receiver: new Address(address),
        gasLimit,
        chainID: configStateSnap.shortId || 'D',
        data,
        value: value || 0,
        sender,
      });

      signAndSendTxOperations(
        networkStateSnap.dappProvider as DappProvider,
        tx,
        loginInfoSnap,
        networkStateSnap.apiNetworkProvider as ApiNetworkProvider,
        setTransaction,
        setTxResult,
        setError,
        setPending,
        webWalletRedirectUrl,
        cb,
        activeGuardianAddress,
        configStateSnap.walletAddress
      );
    } else {
      setError(
        'There is something wrong with the network synchronization. Check if you are logged in.'
      );
    }
  };

  return {
    pending,
    triggerTx,
    transaction,
    txResult,
    error,
  };
}
