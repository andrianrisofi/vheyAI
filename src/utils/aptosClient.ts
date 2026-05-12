import { Aptos } from '@aptos-labs/ts-sdk';
import { aptosConfig } from '../config/network';

export const aptos = new Aptos(aptosConfig);
