import React from 'react';
import { AdminViewServerProps } from 'payload';

interface ConsentScreenProps {
    clientName: string;
    scope: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    state: string;
    userId: string;
    /** Display-friendly scope list derived from raw scope string */
    scopeLabels?: string[];
}
declare function ConsentScreen({ clientName, scope, clientId, redirectUri, codeChallenge, codeChallengeMethod, state, userId, scopeLabels, }: ConsentScreenProps): React.ReactElement;

/**
 * @deprecated OAuth tokens are now surfaced as a native admin collection under
 * the "MCP" nav group. This standalone view is retained for apps that register
 * it manually; prefer the native collection.
 */
declare function TokensView({ initPageResult }: AdminViewServerProps): Promise<React.ReactElement>;

/**
 * @deprecated The OAuth clients are now surfaced as a native admin collection
 * under the "MCP" nav group. This standalone view is retained for apps that
 * register it manually; prefer the native collection.
 */
declare function ClientsView({ initPageResult }: AdminViewServerProps): Promise<React.ReactElement>;

export { ClientsView, ConsentScreen, type ConsentScreenProps, TokensView };
