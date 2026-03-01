/* modified by alip */
const WAProto = require('../../WAProto').proto;
const crypto = require('crypto');
const Utils_1 = require("../Utils");

class yaoii {
    constructor(utils, waUploadToServer, relayMessageFn) {
        this.utils = utils;
        this.relayMessage = relayMessageFn
        this.waUploadToServer = waUploadToServer;
        this.bail = {
            generateWAMessageContent: this.utils.generateWAMessageContent || Utils_1.generateWAMessageContent,
            generateMessageID: Utils_1.generateMessageID,
            getContentType: (msg) => Object.keys(msg.message || {})[0]
        };
    }

    detectType(content) {
        if (content.requestPaymentMessage) return 'PAYMENT';
        if (content.productMessage) return 'PRODUCT';
        if (content.interactiveMessage) return 'INTERACTIVE';
        if (content.albumMessage) return 'ALBUM';
        if (content.eventMessage) return 'EVENT';
        if (content.pollResultMessage) return 'POLL_RESULT';
        if (content.listMessage) return 'LIST';
        if (content.groupStatusMessage) return 'GROUP_STORY';
        if (content.groupStoryMessage) return 'GROUP_STORY';
        return null;
    }

    async handlePayment(content, quoted) {
        const data = content.requestPaymentMessage;
        let notes = {};

        if (data.sticker?.stickerMessage) {
            notes = {
                stickerMessage: {
                    ...data.sticker.stickerMessage,
                    contextInfo: {
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.key?.participant || content.sender,
                        quotedMessage: quoted?.message
                    }
                }
            };
        } else if (data.note) {
            notes = {
                extendedTextMessage: {
                    text: data.note,
                    contextInfo: {
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.key?.participant || content.sender,
                        quotedMessage: quoted?.message
                    }
                }
            };
        }

        return {
            requestPaymentMessage: WAProto.Message.RequestPaymentMessage.fromObject({
                expiryTimestamp: data.expiry || 0,
                amount1000: data.amount || 0,
                currencyCodeIso4217: data.currency || "IDR",
                requestFrom: data.from || "0@s.whatsapp.net",
                noteMessage: notes,
                background: data.background ?? {
                    id: "DEFAULT",
                    placeholderArgb: 0xFFF0F0F0
                }
            })
        };
    }
        
    async handleProduct(content, jid, quoted) {
        const {
            title, 
            description, 
            thumbnail,
            productId, 
            retailerId, 
            url, 
            body = "", 
            footer = "", 
            buttons = [],
            priceAmount1000 = null,
            currencyCode = "IDR"
        } = content.productMessage;

        let productImage;

        if (Buffer.isBuffer(thumbnail)) {
            const { imageMessage } = await this.utils.generateWAMessageContent(
                { image: thumbnail }, 
                { upload: this.waUploadToServer }
            );
            productImage = imageMessage;
        } else if (typeof thumbnail === 'object' && thumbnail.url) {
            const { imageMessage } = await this.utils.generateWAMessageContent(
                { image: { url: thumbnail.url }}, 
                { upload: this.waUploadToServer }
            );
            productImage = imageMessage;
        }

        return {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: body },
                        footer: { text: footer },
                        header: {
                            title,
                            hasMediaAttachment: true,
                            productMessage: {
                                product: {
                                    productImage,
                                    productId,
                                    title,
                                    description,
                                    currencyCode,
                                    priceAmount1000,
                                    retailerId,
                                    url,
                                    productImageCount: 1
                                },
                                businessOwnerJid: "0@s.whatsapp.net"
                            }
                        },
                        nativeFlowMessage: { buttons }
                    }
                }
            }
        };
    }
        
    async handleInteractive(content, jid, quoted) {
        const {
            title,
            footer,
            thumbnail,
            image,
            video,
            document,
            mimetype,
            fileName,
            jpegThumbnail,
            contextInfo,
            externalAdReply,
            buttons = [],
            nativeFlowMessage,
            header
        } = content.interactiveMessage;
        
        let media = null;
        let mediaType = null;
        
        const getMediaPayload = (mediaData, type) => {
            if (typeof mediaData === 'object' && mediaData.url) {
                return { [type]: { url: mediaData.url } };
            }
            return { [type]: mediaData };
        };

        if (thumbnail) {
            media = await this.utils.prepareWAMessageMedia(
                getMediaPayload(thumbnail, 'image'),
                { upload: this.waUploadToServer }
            );
            mediaType = 'image';
        } else if (image) {
            media = await this.utils.prepareWAMessageMedia(
                getMediaPayload(image, 'image'),
                { upload: this.waUploadToServer }
            );
            mediaType = 'image';
        } else if (video) {
            media = await this.utils.prepareWAMessageMedia(
                getMediaPayload(video, 'video'),
                { upload: this.waUploadToServer }
            );
            mediaType = 'video';
        } else if (document) {
            let documentPayload = getMediaPayload(document, 'document');
            
            if (jpegThumbnail) {
                documentPayload.jpegThumbnail = jpegThumbnail;
            }
    
            media = await this.utils.prepareWAMessageMedia(
                documentPayload,
                { upload: this.waUploadToServer }
            );
    
            if (fileName) {
                media.documentMessage.fileName = fileName;
            }
            if (mimetype) {
                media.documentMessage.mimetype = mimetype;
            }
            mediaType = 'document';
        }
        
        let interactiveMessage = {
            body: { text: title || "" },
            footer: { text: footer || "" }
        };
        
        if (buttons && buttons.length > 0) {
            interactiveMessage.nativeFlowMessage = {
                buttons: buttons
            };
    
            if (nativeFlowMessage) {
                interactiveMessage.nativeFlowMessage = {
                    ...interactiveMessage.nativeFlowMessage,
                    ...nativeFlowMessage
                };
            }
        } else if (nativeFlowMessage) {
            interactiveMessage.nativeFlowMessage = nativeFlowMessage;
        }
        
        if (media) {
            interactiveMessage.header = {
                title: header || "",
                hasMediaAttachment: true,
                ...media
            };
        } else {
            interactiveMessage.header = {
                title: header || "",
                hasMediaAttachment: false
            };
        }

        let finalContextInfo = {};
        
        const inputContextInfo = contextInfo || {};
        if (quoted) {
            inputContextInfo.stanzaId = quoted.key.id;
            inputContextInfo.participant = quoted.key.participant || quoted.key.remoteJid;
            inputContextInfo.quotedMessage = quoted.message;
        }

        if (Object.keys(inputContextInfo).length > 0) {
            finalContextInfo = {
                mentionedJid: inputContextInfo.mentionedJid || [],
                forwardingScore: inputContextInfo.forwardingScore || 0,
                isForwarded: inputContextInfo.isForwarded || false,
                ...inputContextInfo
            };
        }

        if (externalAdReply) {
            finalContextInfo.externalAdReply = {
                title: externalAdReply.title || "",
                body: externalAdReply.body || "",
                mediaType: externalAdReply.mediaType || 1,
                thumbnailUrl: externalAdReply.thumbnailUrl || "",
                mediaUrl: externalAdReply.mediaUrl || "",
                sourceUrl: externalAdReply.sourceUrl || "",
                showAdAttribution: externalAdReply.showAdAttribution || false,
                renderLargerThumbnail: externalAdReply.renderLargerThumbnail || false,
                ...externalAdReply
            };
        }
        
        if (Object.keys(finalContextInfo).length > 0) {
            interactiveMessage.contextInfo = finalContextInfo;
        }

        return {
            interactiveMessage: interactiveMessage
        };
    }
        
    async handleAlbum(content, jid, quoted) {
        const array = content.albumMessage;
        const album = await this.utils.generateWAMessageFromContent(jid, {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32),
            },
            albumMessage: {
                expectedImageCount: array.filter((a) => a.hasOwnProperty("image")).length,
                expectedVideoCount: array.filter((a) => a.hasOwnProperty("video")).length,
            },
        }, {
            userJid: this.utils.generateMessageID().split('@')[0] + '@s.whatsapp.net',
            quoted,
            upload: this.waUploadToServer
        });
        
        await this.relayMessage(jid, album.message, {
            messageId: album.key.id,
        });
        
        for (let content of array) {
            const img = await this.utils.generateWAMessage(jid, content, {
                upload: this.waUploadToServer,
            });
            
            img.message.messageContextInfo = {
                messageSecret: crypto.randomBytes(32),
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key,
                },    
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                forwardingScore: 99999,
                isForwarded: true,
                mentionedJid: [jid],
                starred: true,
                labels: ["Y", "Important"],
                isHighlighted: true,
                businessMessageForwardInfo: {
                    businessOwnerJid: jid,
                },
                dataSharingContext: {
                    showMmDisclosure: true,
                },
            };

            img.message.forwardedNewsletterMessageInfo = {
                newsletterJid: "0@newsletter",
                serverMessageId: 1,
                newsletterName: `WhatsApp`,
                contentType: 1,
                timestamp: new Date().toISOString(),
                senderName: "Alip Clutch",
                content: "Text Message",
                priority: "high",
                status: "sent",
            };
            
            img.message.disappearingMode = {
                initiator: 3,
                trigger: 4,
                initiatorDeviceJid: jid,
                initiatedByExternalService: true,
                initiatedByUserDevice: true,
                initiatedBySystem: true,      
                initiatedByServer: true,
                initiatedByAdmin: true,
                initiatedByUser: true,
                initiatedByApp: true,
                initiatedByBot: true,
                initiatedByMe: true,
            };

            await this.relayMessage(jid, img.message, {
                messageId: img.key.id,
                quoted: {
                    key: {
                        remoteJid: album.key.remoteJid,
                        id: album.key.id,
                        fromMe: true,
                        participant: this.utils.generateMessageID().split('@')[0] + '@s.whatsapp.net',
                    },
                    message: album.message,
                },
            });
        }
        return album;
    }   

    async handleEvent(content, jid, quoted) {
        const eventData = content.eventMessage;
        
        const msg = await this.utils.generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                        messageSecret: crypto.randomBytes(32),
                        supportPayload: JSON.stringify({
                            version: 2,
                            is_ai_message: true,
                            should_show_system_message: true,
                            ticket_id: crypto.randomBytes(16).toString('hex')
                        })
                    },
                    eventMessage: {
                        contextInfo: {
                            mentionedJid: [jid],
                            participant: jid,
                            remoteJid: "status@broadcast",
                            forwardedNewsletterMessageInfo: {
                                newsletterName: "alip clutch.",
                                newsletterJid: "120363401467939056@newsletter",
                                serverMessageId: 1
                            },
                            ...(quoted ? {
                                stanzaId: quoted.key.id,
                                participant: quoted.key.participant || quoted.key.remoteJid,
                                quotedMessage: quoted.message
                            } : {})
                        },
                        isCanceled: eventData.isCanceled || false,
                        name: eventData.name,
                        description: eventData.description,
                        location: eventData.location || {
                            degreesLatitude: 0,
                            degreesLongitude: 0,
                            name: "Location"
                        },
                        joinLink: eventData.joinLink || '',
                        startTime: typeof eventData.startTime === 'string' ? parseInt(eventData.startTime) : eventData.startTime || Date.now(),
                        endTime: typeof eventData.endTime === 'string' ? parseInt(eventData.endTime) : eventData.endTime || Date.now() + 3600000,
                        extraGuestsAllowed: eventData.extraGuestsAllowed !== false
                    }
                }
            }
        }, { quoted });
        
        await this.relayMessage(jid, msg.message, {
            messageId: msg.key.id
        });
        return msg;
    }
        
    async handlePollResult(content, jid, quoted) {
        const pollData = content.pollResultMessage;
    
        const msg = await this.utils.generateWAMessageFromContent(jid, {
            pollResultSnapshotMessage: {
                name: pollData.name,
                pollVotes: pollData.pollVotes.map(vote => ({
                    optionName: vote.optionName,
                    optionVoteCount: typeof vote.optionVoteCount === 'number' 
                    ? vote.optionVoteCount.toString() 
                    : vote.optionVoteCount
                }))
            }
        }, {
            userJid: this.utils.generateMessageID().split('@')[0] + '@s.whatsapp.net',
            quoted
        });
    
        await this.relayMessage(jid, msg.message, {
            messageId: msg.key.id
        });
   
        return msg;
    }

    async handleList(content, jid, quoted) {
        const data = content.listMessage;
        
        const listMessagePayload = WAProto.Message.ListMessage.fromObject({
            title: data.title || '',
            description: data.description || '',
            buttonText: data.buttonText || 'Pilih',
            sections: data.sections.map(section => ({
                title: section.title,
                rows: section.rows.map(row => ({
                    rowId: row.rowId || this.utils.generateMessageID(),
                    title: row.title,
                    description: row.description || ''
                }))
            })),
            listType: data.listType || 1, 
            footerText: data.footer || ''
        });

        const listContent = {
            listMessage: listMessagePayload
        };

        const contextInfo = data.contextInfo || {};

        if (quoted) {
            contextInfo.stanzaId = quoted.key.id;
            contextInfo.participant = quoted.key.participant || quoted.key.remoteJid;
            contextInfo.quotedMessage = quoted.message;
        }

        if (Object.keys(contextInfo).length > 0) {
            listContent.listMessage.contextInfo = contextInfo;
        }

        const msg = await this.utils.generateWAMessageFromContent(
            jid, 
            listContent, 
            { quoted }
        );
        
        await this.relayMessage(jid, msg.message, { messageId: msg.key.id });

        return msg;
    }

    async handleGroupStory(content, jid, quoted) {
        if (content.groupStatusMessage) {
            const storyData = content.groupStatusMessage;
            let waMsgContent;
            
            if (storyData.message) {
                waMsgContent = storyData;
            } else {
                if (typeof this.bail?.generateWAMessageContent === "function") {
                    waMsgContent = await this.bail.generateWAMessageContent(storyData, {
                        upload: this.waUploadToServer
                    });
                } else if (typeof this.utils?.generateWAMessageContent === "function") {
                    waMsgContent = await this.utils.generateWAMessageContent(storyData, {
                        upload: this.waUploadToServer
                    });
                } else if (typeof this.utils?.prepareMessageContent === "function") {
                    waMsgContent = await this.utils.prepareMessageContent(storyData, {
                        upload: this.waUploadToServer
                    });
                } else {
                    waMsgContent = await Utils_1.generateWAMessageContent(storyData, {
                        upload: this.waUploadToServer
                    });
                }
            }
    
            let msg = {
                message: {
                    groupStatusMessageV2: {
                        message: waMsgContent.message || waMsgContent
                    }
                }
            };
    
            return await this.relayMessage(jid, msg.message, {
                messageId: this.bail.generateMessageID()
            });

        } else if (content.groupStoryMessage) {
            const { groupStoryMessage } = content;
            
            if (!this.utils.isJidGroup(jid)) {
                throw new Error("Group Story messages must be sent to a group JID.");
            }
    
            let mediaContent = {};
            
            if (groupStoryMessage.image || groupStoryMessage.video) {
                const mediaData = groupStoryMessage.image || groupStoryMessage.video;
                const mediaType = groupStoryMessage.image ? 'image' : 'video';
                
                let stream;
                if (Buffer.isBuffer(mediaData)) {
                    stream = mediaData;
                } else if (typeof mediaData === 'object' && mediaData.url) {
                    throw new Error("Group Story media from URL is not supported in this simplified handler. Use Buffer or fetch it first.");
                } else {
                    stream = Buffer.from(mediaData, 'base64');
                }
    
                const upload = await this.waUploadToServer(stream, { 
                    mediaType: mediaType,
                });
                
                mediaContent = {
                    [mediaType + 'Message']: {
                        url: upload.url,
                        mimetype: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
                        caption: groupStoryMessage.caption,
                        fileSha256: upload.fileSha256,
                        fileEncSha256: upload.fileEncSha256,
                        mediaKey: upload.mediaKey,
                        fileLength: upload.fileLength,
                        directPath: upload.directPath,
                        mediaKeyTimestamp: this.utils.unixTimestampSeconds(), 
                        jpegThumbnail: groupStoryMessage.jpegThumbnail,
                    }
                };
            } else if (groupStoryMessage.caption) {
                mediaContent = {
                    extendedTextMessage: {
                        text: groupStoryMessage.caption
                    }
                };
            } else {
                throw new Error("Group Story content must contain image, video, or caption.");
            }
            
            const groupStatusMessageContent = {
                groupStatusMessage: {
                    key: {
                        remoteJid: jid,
                        fromMe: true,
                        id: this.utils.generateMessageID(),
                        participant: this.utils.jidNormalizedUser(this.utils.auth.creds.me.id)
                    },
                    message: {
                        ...mediaContent,
                        contextInfo: {
                            mentionedJid: groupStoryMessage.mentions || [],
                            ...(quoted ? {
                                stanzaId: quoted.key.id,
                                participant: quoted.key.participant || quoted.key.remoteJid,
                                quotedMessage: quoted.message
                            } : {})
                        }
                    },
                }
            };
    
            const fullMsg = await this.utils.generateWAMessageFromContent(
                jid,
                groupStatusMessageContent,
                { quoted, logger: this.utils.logger } 
            );
            
            await this.relayMessage(jid, fullMsg.message, {
                messageId: fullMsg.key.id,
                type: 'group_status', 
            });
    
            return fullMsg;
        } else {
            throw new Error("Invalid content for handleGroupStory. Neither groupStatusMessage nor groupStoryMessage found.");
        }
    }
}

module.exports = yaoii;
