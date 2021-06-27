const Discord = require("discord.js")
const client = new Discord.Client();
const ayar = require("./settings.js")
const fs = require("fs");
const moment = require('moment')
const db = require('quick.db')
require('./util/Loader.js')(client);

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir('./Commands/', (err, files) => {
    if (err) console.error(err);
    console.log(`${files.length} komut yüklenecek.`);
    files.forEach(f => {
        let props = require(`./Commands/${f}`);
        console.log(`${props.config.name} komutu yüklendi.`);
        client.commands.set(props.config.name, props);
        props.config.aliases.forEach(alias => {
            client.aliases.set(alias, props.config.name);
        });
    });
})

client.login(ayar.bot.botToken)


const invites = {};
const wait = require("util").promisify(setTimeout);
client.on('ready', () => {
    wait(1000);
    client.guilds.cache.forEach(g => {
        g.fetchInvites().then(guildInvites => {
            invites[g.id] = guildInvites;
        });
    });
})

client.on('guildMemberAdd', (member) => {
    if (member.user.bot) return;
    const user = client.users.cache.get(member.id);
    member.guild.fetchInvites().then(async guildInvites => {
        const ei = invites[member.guild.id];
        invites[member.guild.id] = guildInvites;
        const veri = await guildInvites.find(i => (ei.get(i.code) == null ? (i.uses - 1) : ei.get(i.code).uses) < i.uses);
        var daveteden;
        if (!veri) daveteden = "Bulunamadı"
        else daveteden = member.guild.members.cache.get(veri)
        var b = veri.guild.vanityURLCode
        if (!b) b = veri.code
        if (veri.code == b) daveteden = member.guild.members.cache.get(veri.inviter.id)
        else daveteden = member.guild;
        db.add(`davetsayi.${daveteden.id}.${member.guild.id}`, +1);
        db.add(`toplam.${daveteden.id}.${member.guild.id}`, +1);
        db.push(`günlük.${daveteden.id}.${member.guild.id}`, { userID: member.user.id })
        let zaman = require("moment").duration(new Date().getTime() - client.users.cache.get(member.id).createdAt.getTime())
        if (zaman < 604800017) {
            db.add(`davetsayi.${daveteden.id}.${member.guild.id}`, -1);
            db.add(`fake.${daveteden.id}_${member.guild.id}`, +1);
        }
        db.set(`veri.${member.id}.${member.guild.id}`, daveteden.id);
        let a = await db.fetch(`davetsayi.${daveteden.id}.${member.guild.id}`);
        let davetsayi;
        if (!a) { davetsayi = 0; } else { davetsayi = await db.fetch(`davetsayi.${daveteden.id}.${member.guild.id}`); }
        var y;
        if (daveteden.id == member.guild.id) y = "Özel URL"
        else y = daveteden
        let şüphe = Date.now() - member.user.createdTimestamp < 1000 * 60 * 60 * 24 * 10 ? "Şüpheli!" : "Güvenli!"
        if (şüphe === "Şüpheli!") {
            if (member.manageable) member.roles.set([ayar.roles.Suspecious])
            member.guild.channels.cache.get(ayar.channel.registerChat).send(
                new Discord.MessageEmbed()
                .setColor("#ff0000")
                .setAuthor(member.user.username, member.user.avatarURL({ dynamic: true }))
                .setDescription(`${member}, Adlı Kullanıcı Sunucuya Katıldı Hesabı **${createAt2}** Önce Açıldığı İçin Şüpheli!`)
                .setTimestamp()
                .setFooter(`${y} tarafından davet edildi`))

        } else {
            member.setNickname(`${ayar.guild.unTag} İsim | Yaş`)
            member.guild.channels.cache.get(ayar.channel.registerChat).send(`
            Sunucumuza hoş geldin ${member}!
    
            Hesabın **${moment(member.user.createdTimestamp).locale('tr').format("LLL")}** tarihinde (\`${moment.duration(Date.now() - member.user.createdTimestamp).format('Y [yıl], M [Ay], D [Gün]')}\`) önce oluşturulmuş. Hesap **${şüphe}**
        
            Sunucu kurallarımız <#${ayar.channel.rules}> kanalında belirtilmiştir.
        
            Ayrıca bize destek olmak için tagımızı alabilirsin. **${ayar.guild.tag}**

            Seninle beraber **${member.guild.memberCount}** kişiyiz. ${y} tarafından davet edildin bu kişinin **${davetsayi}.** daveti. :tada::tada:
`)
        }
    });
});


client.on("guildMemberRemove", async member => {
    const user = client.users.cache.get(member.id);

    member.guild.fetchInvites().then(async guildInvites => {
        const veri = await db.fetch(`veri.${member.id}.${member.guild.id}`);
        var daveteden;
        if (!veri) daveteden = "Bulunamadı"
        else daveteden = member.guild.members.cache.get(veri)

        let zaman = require("moment").duration(new Date().getTime() - client.users.cache.get(member.id).createdAt.getTime())

        if (zaman < 1296000000) {
            db.add(`fake.${daveteden.id}.${member.guild.id}`, -1);
            db.add(`davetsayi.${daveteden.id}.${member.guild.id}`, -1);
            if (veri) {
                db.delete(`veri.${member.id}.${member.guild.id}`);
            }
        } else {
            db.add(`davetsayi.${daveteden.id}.${member.guild.id}`, -1);
            if (veri) {
                db.delete(`veri.${member.id}.${member.guild.id}`);
            }
        }
        var y;
        if (daveteden.id == member.guild.id) y = "Özel URL"
        const davetsayi = await db.fetch(`davetsayi.${daveteden.id}.${member.guild.id}`);

    })
});
