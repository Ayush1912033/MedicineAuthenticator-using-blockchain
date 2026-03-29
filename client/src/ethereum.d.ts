import type { providers } from "ethers";

interface EthereumRequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface EthereumProvider extends providers.ExternalProvider {
  request(args: EthereumRequestArguments): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
