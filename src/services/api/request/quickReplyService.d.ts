type QuickReplyRequestParams = { clientId: string };

type FindAllQuickRepliesRequestData = { params: QuickReplyRequestParams };

type CreateQuickReplyRequestData = { params: QuickReplyRequestParams; body: SaveQuickReplyBody };

type UpdateQuickReplyRequestData = { params: QuickReplyRequestParams & { id: string }; body: SaveQuickReplyBody };

type DeleteQuickReplyRequestData = { params: QuickReplyRequestParams & { id: string } };
