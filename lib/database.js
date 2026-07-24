export default function (m, conn) {
    try {
        const defaultUser = {
            name: m.name,
            exp: 0,
            money: 0, // Tambahan Ekonomi
            hutang: 0, // Tambahan Ekonomi
            hutangTime: 0, // Waktu pinjam hutang
            lastpinjam: 0,
            level: 1,
            limit: 20,
            age: -1,
            regTime: -1,
            afk: -1,
            afkReason: '',
            warn: 0,
            role: 'Newbie',
            premium: false,
            premiumTime: 0,
            registered: false,
            banned: false,
            autolevelup: false,
            // Properti mancing jika dibutuhkan
            rod: 100,
            bait: 'None',
            bait_count: 0,
            location: 'Empang',
            total_tangkapan: 0
        };

        const defaultChat = {
            sWelcome: '',
            sBye: '',
            sPromote: '',
            sDemote: '',
            isBanned: false,
            welcome: false,
            detect: false,
            delete: false,
            viewOnce: false,
            autodl: true,
            notifsholat: false, 
            kotaSholat: '',
            namaKota: '',
            lastNotif: '' // Untuk mencegah duplikat notif di menit yang sama
        };

        const defaultSettings = {
            public: true,
            autoread: true,
            anticall: true,
            antiviewonceAll: false
        };

        // === USER ===
        if (m.sender.endsWith('@s.whatsapp.net')) {
            if (!global.db.data.users[m.sender])
                global.db.data.users[m.sender] = {
                    ...defaultUser,
                };
            else (Object.assign(defaultUser, global.db.data.users[m.sender]), (global.db.data.users[m.sender] = defaultUser));
        }
        
        // === GROUP / PRIVATE CHAT ===
        // Note: m.chat mencakup JID grup maupun JID pribadi
        if (!global.db.data.chats[m.chat])
            global.db.data.chats[m.chat] = {
                ...defaultChat,
            };
        else (Object.assign(defaultChat, global.db.data.chats[m.chat]), (global.db.data.chats[m.chat] = defaultChat));

        // === SETTINGS ===
        if (!global.db.data.settings[conn.user.jid])
            global.db.data.settings[conn.user.jid] = {
                ...defaultSettings,
            };
        else (Object.assign(defaultSettings, global.db.data.settings[conn.user.jid]), (global.db.data.settings[conn.user.jid] = defaultSettings));
        
    } catch (e) {
        console.error(e);
    }
}