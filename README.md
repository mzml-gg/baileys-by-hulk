<h1 align="center">
  Angularsockets
</h1>

<p align="center">
  <img src="https://dabby.vercel.app/menu.jpg" width="400" style="border-radius:8px;">
</p>

<p align="center">
  <strong>Enterprise-Grade WhatsApp Business API</strong>
</p>

<p align="center">
  <sub>High-performance modified Baileys library for scalable WhatsApp integrations</sub>
</p>

---

# 🎀 Angularsockets

> **Angularsockets** a mod og *Baileys WhatsApp Web API* by **Mr Frank** 
---

## ✨ Mafeatures
✅ Stabil & lasts long 

✅ Support multi-device (MD)  

✅ Support buttons

✅ SSupport Custom Pairing Code

✅ Support  Group

---

## 📦 Installation
Install npm
```bash
npm i angularsockets


## Handling Events

- Baileys uses the EventEmitter syntax for events. 
They're all nicely typed up, so you shouldn't have any issues with an Intellisense editor like VS Code.

> [!IMPORTANT]
> **The events are [these](https://baileys.whiskeysockets.io/types/BaileysEventMap.html)**, it's important you see all events

You can listen to these events like this:
```ts
const sock = makeWASocket()
sock.ev.on('messages.upsert', ({ messages }) => {
    console.log('got messages', messages)
})
```
This is a fix mention @lid for bots working in groups

```js

sock.ev.on('messages.upsert', async chatUpdate => {
try {
mek = chatUpdate.messages[0]
if (!mek.message) return
mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
const m = mek
const isGroup = m.key.remoteJid.endsWith('@g.us');
const mentionedJid = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
if (isGroup && Array.isArray(mentionedJid) && mentionedJid.some(j => j.endsWith('@lid'))) {
    const groupMetadata = await sock.groupMetadata(mek.key.remoteJid);
    const resolvedMentions = mentionedJid.map(jid => {
        if (jid.endsWith('@lid')) {
            const match = groupMetadata.participants.find(p => p.id === jid);
            return match?.jid || jid;
        }
        return jid;
    });
    mek.message.extendedTextMessage.contextInfo.mentionedJid = resolvedMentions;
const lidMap = {};
mentionedJid.forEach(originalLid => {
    if (originalLid.endsWith('@lid')) {
        const match = groupMetadata.participants.find(p => p.id === originalLid);
        if (match && match.jid) {
            const jidNumber = match.jid.split('@')[0]; 
            const lidNumber = originalLid.split('@')[0];
            lidMap[lidNumber] = jidNumber;
        }
    }
});
const replaceLidInText = (text) => {
    if (!text) return text;
    Object.entries(lidMap).forEach(([lidNum, jidNum]) => {
        const regex = new RegExp(`@${lidNum}\\b`, 'g');
        text = text.replace(regex, `@${jidNum}`);
    });
    return text;
};
if (mek.message.conversation) {
    mek.message.conversation = replaceLidInText(mek.message.conversation);
}
if (mek.message.extendedTextMessage?.text) {
    mek.message.extendedTextMessage.text = replaceLidInText(mek.message.extendedTextMessage.text);
}
    let msg = {
        messages: [proto.WebMessageInfo.fromObject(mek)],
        type: "append",
    };
    return conn.ev.emit("messages.upsert", msg);
}
} catch (err) {

}
});

```
