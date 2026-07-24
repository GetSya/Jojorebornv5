let handler = async (m, { conn }) => {
    conn.jt_session = conn.jt_session ? conn.jt_session : {}
    conn.jt_session[m.sender] = true
    await m.reply(`*PENGISIAN DATA JATUH TEMPO*\n\nSilahkan balas dengan format:\n\nemail:\nsumber:\njatuh tempo: DD-MM-YYYY`)
}
handler.command = /^(setjt)$/i
export default handler