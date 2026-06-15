import type { ConnectorType } from '@/types';

export type FreeConnectorId = 'linkchat' | 'telegram' | 'email' | 'discord' | 'matrix';

export interface FreeConnectorProvider {
  id: FreeConnectorId;
  name: string;
  description: string;
  color: string;
  apiType?: ConnectorType;
  placeholder: string;
  hint: string;
}

export const FREE_CONNECTORS: FreeConnectorProvider[] = [
  {
    id: 'linkchat',
    name: 'LinkChat',
    description: 'Your built-in chats — always connected',
    color: 'from-emerald-500 to-green-600',
    placeholder: '',
    hint: '',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Live chat via your Telegram bot (BotFather token)',
    color: 'from-sky-400 to-blue-500',
    apiType: 'TELEGRAM',
    placeholder: 'Bot token from @BotFather',
    hint: 'Create a bot in @BotFather, paste the API token here',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Quick compose to saved contacts',
    color: 'from-orange-400 to-red-500',
    apiType: 'EMAIL',
    placeholder: 'name@example.com',
    hint: 'Email address to message',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Open Discord DMs or invite links',
    color: 'from-indigo-500 to-violet-600',
    apiType: 'DISCORD',
    placeholder: 'username or invite link',
    hint: 'Discord username or https://discord.gg/…',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    description: 'Open federated Matrix chats',
    color: 'from-teal-500 to-cyan-600',
    apiType: 'MATRIX',
    placeholder: '@user:matrix.org',
    hint: 'Full Matrix ID including homeserver',
  },
];

export function getConnectorProvider(type: ConnectorType) {
  return FREE_CONNECTORS.find((p) => p.apiType === type);
}

export function connectorDisplayId(connector: { type: ConnectorType; identifier: string }) {
  switch (connector.type) {
    case 'TELEGRAM':
      return `@${connector.identifier}`;
    case 'EMAIL':
      return connector.identifier;
    case 'DISCORD':
      return connector.identifier.startsWith('http') ? 'Discord invite' : `@${connector.identifier}`;
    case 'MATRIX':
      return connector.identifier;
    default:
      return connector.identifier;
  }
}

export function openConnector(connector: { type: ConnectorType; identifier: string }) {
  let url: string;

  switch (connector.type) {
    case 'TELEGRAM':
      url = `https://t.me/${connector.identifier}`;
      break;
    case 'EMAIL':
      url = `mailto:${connector.identifier}`;
      break;
    case 'DISCORD':
      url = connector.identifier.startsWith('http')
        ? connector.identifier
        : `https://discord.com/users/${connector.identifier}`;
      break;
    case 'MATRIX':
      url = `https://matrix.to/#/${encodeURIComponent(connector.identifier)}`;
      break;
    default:
      return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
