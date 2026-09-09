import { proto, generateWAMessage, areJidsSameUser } from 'ourin-baileys';

export async function all(m, chatUpdate) {
	if (m.isBaileys) return;
	if (!m.message) return;
	// interactiveResponseMessage (native flow buttons/list ourin-baileys) SUDAH
	// diurai menjadi m.text oleh parser nativeFlowResponseMessage di lib/simple.js.
	// Me-re-emit di sini bikin command yang di-tap jalan 2x (pesan ganda).
	if (m.message.interactiveResponseMessage) return;
	if (!(m.message.buttonsResponseMessage || m.message.templateButtonReplyMessage || m.message.listResponseMessage || m.message.pollUpdateMessage)) return;

	let id =
		m.mtype === 'conversation'
			? m.message.conversation
			: m.mtype == 'imageMessage'
				? m.message.imageMessage.caption
				: m.mtype == 'videoMessage'
					? m.message.videoMessage.caption
					: m.mtype == 'extendedTextMessage'
						? m.message.extendedTextMessage.text
						: m.mtype == 'buttonsResponseMessage'
							? m.message.buttonsResponseMessage.selectedButtonId
							: m.mtype == 'listResponseMessage'
								? m.message.listResponseMessage.singleSelectReply.selectedRowId
								: m.mtype == 'templateButtonReplyMessage'
									? m.message.templateButtonReplyMessage.selectedId
									: m.mtype == 'interactiveResponseMessage'
										? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id
										: m.mtype == 'templateButtonReplyMessage'
											? appenTextMessage(m.msg.selectedId, chatUpdate)
											: m.mtype === 'messageContextInfo'
												? m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text
												: '';

	let messages = await generateWAMessage(
		m.chat,
		{ text: id, mentions: m.mentionedJid },
		{
			userJid: this.user.jid,
			quoted: m.quoted && m.quoted.fakeObj,
		}
	);
	messages.key.remoteJid = m.chat;
	messages.key.fromMe = areJidsSameUser(m.sender, this.user.id);
	messages.key.id = m.key.id;
	messages.pushName = m.pushName;
	if (m.isGroup) messages.key.participant = messages.participant = m.sender;
	let msg = {
		...chatUpdate,
		messages: [proto.WebMessageInfo.create(messages)].map((v) => ((v.conn = this), v)),
		type: 'append',
	};
	this.ev.emit('messages.upsert', msg);
}
