// setup.d.ts by alip
import { proto } from '../../WAProto';

declare namespace NotForrAll {
    interface MediaUploadOptions {
        fileEncSha256?: Buffer;
        mediaType?: string;
        newsletter?: boolean;
    }

    type WAMediaUploadFunction = (
        stream: Buffer | NodeJS.ReadableStream, 
        options?: MediaUploadOptions
    ) => Promise<{ url: string; directPath: string; mediaKey: Buffer; fileEncSha256: Buffer; fileSha256: Buffer; fileLength: number }>;

    interface WAMessageContentGenerationOptions {
        upload?: WAMediaUploadFunction;
        mediaCache?: any;
        options?: any;
        logger?: any;
    }

    interface StickerMessage {
        url: string;
        fileSha256: Buffer | string;
        fileEncSha256: Buffer | string;
        mediaKey: Buffer | string;
        mimetype: string;
        directPath: string;
        fileLength: number | string;
        mediaKeyTimestamp: number | string;
        isAnimated?: boolean;
        stickerSentTs?: number | string;
        isAvatar?: boolean;
        isAiSticker?: boolean;
        isLottie?: boolean;
    }

    interface PaymentMessage {
        amount: number;
        currency?: string;
        from?: string;
        expiry?: number;
        sticker?: { stickerMessage: StickerMessage };
        note?: string;
        background?: {
            id?: string;
            fileLength?: string;
            width?: number;
            height?: number;
            mimetype?: string;
            placeholderArgb?: number;
            textArgb?: number;
            subtextArgb?: number;
        };
    }

    interface ProductMessage {
        title: string;
        description: string;
        thumbnail: Buffer | { url: string };
        productId: string;
        retailerId: string;
        url: string;
        body?: string;
        footer?: string;
        buttons?: proto.Message.InteractiveMessage.INativeFlowButton[];
        priceAmount1000?: number | null;
        currencyCode?: string;
    }

    interface InteractiveMessage {
        title: string;
        footer?: string;
        thumbnail?: string;
        image?: string | Buffer | { url: string };
        video?: string | Buffer | { url: string };
        document?: Buffer;
        mimetype?: string;
        fileName?: string;
        jpegThumbnail?: Buffer; 
        contextInfo?: {
            mentionedJid?: string[];
            forwardingScore?: number;
            isForwarded?: boolean;
            externalAdReply?: {
                title?: string;
                body?: string;
                mediaType?: number;
                thumbnailUrl?: string;
                mediaUrl?: string;
                sourceUrl?: string;
                showAdAttribution?: boolean;
                renderLargerThumbnail?: boolean;
                [key: string]: any;
            };
            [key: string]: any;
        };
        externalAdReply?: {
            title?: string;
            body?: string;
            mediaType?: number;
            thumbnailUrl?: string;
            mediaUrl?: string;
            sourceUrl?: string;
            showAdAttribution?: boolean;
            renderLargerThumbnail?: boolean;
            [key: string]: any;
        };
        buttons?: proto.Message.InteractiveMessage.INativeFlowButton[];
        nativeFlowMessage?: {
            messageParamsJson?: string;
            buttons?: proto.Message.InteractiveMessage.INativeFlowButton[];
            [key: string]: any;
        };
    }

    interface AlbumItem {
        image?: { url: string; caption?: string };
        video?: { url: string; caption?: string };
    }

    interface EventMessageLocation {
        degreesLatitude: number;
        degreesLongitude: number;
        name: string;
    }

    interface EventMessage {
        isCanceled?: boolean;
        name: string;
        description: string;
        location?: EventMessageLocation;
        joinLink?: string;
        startTime?: string | number;
        endTime?: string | number;
        extraGuestsAllowed?: boolean;
    }
    
    interface PollVote {
        optionName: string;
        optionVoteCount: string | number;
    }
    
    interface PollResultMessage {
        name: string;
        pollVotes: PollVote[];
    }

    // --- BARU: List Message ---
    interface ListSection {
        title: string;
        rows: ListRow[];
    }

    interface ListRow {
        rowId: string;
        title: string;
        description?: string;
    }

    interface ListMessage {
        title: string;
        description: string;
        buttonText: string;
        sections: ListSection[];
        listType?: number; 
        contextInfo?: proto.IMessageContextInfo;
        footer?: string;
    }

    // --- BARU: Group Story ---
    interface GroupStoryMessage {
        image?: Buffer | string | { url: string };
        video?: Buffer | string | { url: string };
        caption?: string;
        mentions?: string[]; 
        jpegThumbnail?: Buffer;
    }
 
    interface MessageContent {
        requestPaymentMessage?: PaymentMessage;
        productMessage?: ProductMessage;
        interactiveMessage?: InteractiveMessage;
        albumMessage?: AlbumItem[];
        eventMessage?: EventMessage;
        pollResultMessage?: PollResultMessage;
        sender?: string;
        listMessage?: ListMessage; // <-- BARU
        groupStoryMessage?: GroupStoryMessage; // <-- BARU
    }

    interface MessageOptions {
        quoted?: proto.IWebMessageInfo;
        filter?: boolean;
    }

    interface Utils {
        // Asumsi Utils punya akses ke auth state untuk jid
        auth: { creds: { me: { id: string } } }; 
        unixTimestampSeconds: () => number; // Fungsi yang umum ada di Utils
        prepareWAMessageMedia: (media: any, options: WAMessageContentGenerationOptions) => Promise<any>;
        generateWAMessageContent: (content: any, options: WAMessageContentGenerationOptions) => Promise<any>;
        generateWAMessageFromContent: (jid: string, content: any, options?: any) => Promise<any>;
        generateWAMessage: (jid: string, content: any, options?: any) => Promise<any>;
        generateMessageID: () => string;
        // Asumsi Utils punya fungsi WABinary terkait JID
        jidNormalizedUser: (jid: string) => string;
        isJidGroup: (jid: string) => boolean;
    }
}

declare class NotForrAll {
    constructor(
        utils: NotForrAll.Utils,
        waUploadToServer: NotForrAll.WAMediaUploadFunction,
        relayMessageFn?: (jid: string, content: any, options?: any) => Promise<any>
    );
    
    detectType(content: NotForrAll.MessageContent): 'PAYMENT' | 'PRODUCT' | 'INTERACTIVE' | 'ALBUM' | 'EVENT' | 'POLL_RESULT' | 'LIST' | 'GROUP_STORY' | null; // <-- Diperbarui

    handlePayment(
        content: { requestPaymentMessage: NotForrAll.PaymentMessage },
        quoted?: proto.IWebMessageInfo
    ): Promise<{ requestPaymentMessage: proto.Message.RequestPaymentMessage }>;

    handleProduct(
        content: { productMessage: NotForrAll.ProductMessage },
        jid: string,
        quoted?: proto.IWebMessageInfo
    ): Promise<{ viewOnceMessage: proto.Message.ViewOnceMessage }>;

    handleInteractive(
        content: { interactiveMessage: NotForrAll.InteractiveMessage },
        jid: string,
        quoted?: proto.IWebMessageInfo
    ): Promise<{ interactiveMessage: proto.Message.InteractiveMessage }>;

    handleAlbum(
        content: { albumMessage: NotForrAll.AlbumItem[] },
        jid: string,
        quoted?: proto.IWebMessageInfo
    ): Promise<any>;

    handleEvent(
        content: { eventMessage: NotForrAll.EventMessage },
        jid: string,
        quoted?: proto.IWebMessageInfo
    ): Promise<any>;
    
    handlePollResult(
        content: { pollResultMessage: NotForrAll.PollResultMessage },
        jid: string,
        quoted?: proto.IWebMessageInfo
    ): Promise<any>;

    handleList( // <-- BARU
        content: { listMessage: NotForrAll.ListMessage },
        jid: string,
        quoted?: proto.IWebMessageInfo
    ): Promise<any>;

    handleGroupStory( // <-- BARU
        content: { groupStoryMessage: NotForrAll.GroupStoryMessage },
        jid: string,
        quoted?: proto.IWebMessageInfo
    ): Promise<any>;
}

export = NotForrAll;
