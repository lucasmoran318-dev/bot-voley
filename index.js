require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = "!";
const IMAGEN_PANEL = "https://img.magnific.com/foto-gratis/ilustracion-ojos-anime_23-2151660532.jpg?semt=ais_hybrid&w=740&q=80";
const DB_FILE = './equipos_db.json';

// IDs de los roles autorizados (Co Owner y Bot Staff)
const ROLES_PERMITIDOS = ['1481027229134880842', '1475240887716941885'];
const MSG_ERROR_PERMISOS = "Error: Solo el Co Owner y Bot Staff pueden usar este comando.";

let db = {};
if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

client.once('ready', () => {
    console.log(`Bot de Voley conectado con exito como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const comando = args.shift().toLowerCase();
    const guildId = message.guild.id;

    if (!db[guildId]) db[guildId] = {};

    const miembro = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!miembro) return;

    const tienePermiso = miembro.roles.cache.some(role => ROLES_PERMITIDOS.includes(role.id));

    switch (comando) {
        
        case 'panel':
        case 'ayuda': {
            const embed = new EmbedBuilder()
                .setTitle("PANEL DE CONTROL Y COMANDOS")
                .setDescription("Lista de comandos disponibles. Todos usan el prefijo !.")
                .setColor("#5865F2")
                .addFields(
                    { name: "Visualizacion", value: "`!tabla` — Muestra la tabla general.\n`!divisiones` — Muestra la clasificacion por divisiones." },
                    { name: "Gestion de Equipos (Co Owner / Bot Staff)", value: "`!agregar-equipo @Rol :emoji:`\n`!eliminar-equipo @Rol`" },
                    { name: "Carga de Sets (Co Owner / Bot Staff)", value: "`!resultado @EquipoA 2 @EquipoB 1`" },
                    { name: "Correcciones Manuales (Co Owner / Bot Staff)", value: "`!sumar @Rol <puntos>` — Añade puntos directamente.\n`!restar @Rol <puntos>` — Quita puntos directamente." },
                    { name: "Comunidad", value: "`!nuez` — La verdadera razon sobre Nuez." }
                )
                .setImage(IMAGEN_PANEL)
                .setTimestamp()
                .setFooter({ text: "ELITE SIX Volleyball System", iconURL: client.user.displayAvatarURL() });

            return message.channel.send({ embeds: [embed] });
        }

        case 'nuez': {
            const embed = new EmbedBuilder()
                .setTitle("🚨 EXPLICACIÓN OFICIAL SOBRE NUEZ")
                .setDescription(
                    "Acá les dejamos las razones reales de por qué Nuez se volvió gey de un día para otro:\n\n" +
                    "• Se cansó de andar de rudo en el juego y prefirió empezar a ponerse lindo.\n" +
                    "• Le empezó a gustar demasiado cómo se ven los pibes del Staff de ÉLITE SIX.\n" +
                    "• Vio que las nueces normales son aburridas y prefirió brillar con más estilo."
                )
                .setColor("#FF69B4")
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        case 'agregar-equipo': {
            if (!tienePermiso) return message.reply(MSG_ERROR_PERMISOS);

            const role = message.mentions.roles.first();
            const emojiAsignado = args[1]; 

            if (!role || !emojiAsignado) {
                return message.reply("Error: Usa `!agregar-equipo @Rol :emoji:`");
            }

            if (db[guildId][role.id]) {
                return message.reply(`El equipo ${role} ya se encuentra registrado.`);
            }

            db[guildId][role.id] = { puntos: 0, emoji: emojiAsignado };
            saveDB();

            const embed = new EmbedBuilder()
                .setTitle("Equipo Registrado")
                .setDescription(`El equipo ${emojiAsignado} ${role} ha sido añadido con exito.`)
                .setColor("#57F287")
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        case 'eliminar-equipo': {
            if (!tienePermiso) return message.reply(MSG_ERROR_PERMISOS);

            const role = message.mentions.roles.first();
            if (!role || !db[guildId][role.id]) {
                return message.reply("Error: Menciona un rol de equipo registrado.");
            }

            delete db[guildId][role.id];
            saveDB();

            const embed = new EmbedBuilder()
                .setTitle("Equipo Eliminado")
                .setDescription(`El equipo con el rol ${role} fue removido.`)
                .setColor("#ED4245")
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        // ==========================================
        // COMANDO: !resultado @EquipoA 2 @EquipoB 1
        // ==========================================
        case 'resultado': {
            if (!tienePermiso) return message.reply(MSG_ERROR_PERMISOS);

            const rolesMencionados = message.mentions.roles.map(r => r.id);
            if (rolesMencionados.length < 2) {
                return message.reply("Error: Debes mencionar a los dos equipos. Ejemplo: `!resultado @EquipoA 2 @EquipoB 1`.");
            }

            const idEquipo1 = rolesMencionados[0];
            const idEquipo2 = rolesMencionados[1];

            if (!db[guildId][idEquipo1] || !db[guildId][idEquipo2]) {
                return message.reply("Error: Uno o ambos equipos no están registrados en el sistema.");
            }

            const textoMensaje = message.content;
            const regexMencion = /<@&(\d+)>\s*(\d+)/g;
            
            let emparejamientos = {};
            let match;

            while ((match = regexMencion.exec(textoMensaje)) !== null) {
                const roleId = match[1];
                const cantidadSets = parseInt(match[2]);
                emparejamientos[roleId] = cantidadSets;
            }

            const setsEquipo1 = emparejamientos[idEquipo1];
            const setsEquipo2 = emparejamientos[idEquipo2];

            if (setsEquipo1 === undefined || setsEquipo2 === undefined) {
                return message.reply("Error: Debes poner el número de sets justo después de cada equipo. Ejemplo: `!resultado @EquipoA 2 @EquipoB 1`.");
            }

            const marcador = `${setsEquipo1}-${setsEquipo2}`;
            const marcadoresValidos = ["2-0", "2-1", "0-2", "1-2"];

            if (!marcadoresValidos.includes(marcador)) {
                return message.reply("⚠️ **Marcador Inválido:** Solo valen los resultados de vóley al mejor de 3: `2-0`, `2-1`, `0-2` o `1-2`.");
            }

            let idGanador, idPerdedor, setsGanador, setsPerdedor;

            if (setsEquipo1 === 2) {
                idGanador = idEquipo1;
                idPerdedor = idEquipo2;
                setsGanador = setsEquipo1;
                setsPerdedor = setsEquipo2;
            } else {
                idGanador = idEquipo2;
                idPerdedor = idEquipo1;
                setsGanador = setsEquipo2;
                setsPerdedor = setsEquipo1;
            }

            db[guildId][idGanador].puntos += 5;
            db[guildId][idPerdedor].puntos -= 3;
            saveDB();

            const emojiGanador = db[guildId][idGanador].emoji || "";
            const emojiPerdedor = db[guildId][idPerdedor].emoji || "";

            const embed = new EmbedBuilder()
                .setTitle("🏐 RESULTADO PROCESADO")
                .setDescription(`Las puntuaciones se actualizaron al instante.`)
                .addFields(
                    { name: `🏆 Ganador (+5 pts)`, value: `${emojiGanador} <@&${idGanador}> — **${setsGanador} Sets** (Total: ${db[guildId][idGanador].puntos} pts)`, inline: false },
                    { name: `❌ Perdedor (-3 pts)`, value: `${emojiPerdedor} <@&${idPerdedor}> — **${setsPerdedor} Sets** (Total: ${db[guildId][idPerdedor].puntos} pts)`, inline: false }
                )
                .setColor("#57F287")
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        // ==========================================
        // COMANDO ACORTADO: !sumar
        // ==========================================
        case 'sumar': {
            if (!tienePermiso) return message.reply(MSG_ERROR_PERMISOS);

            const role = message.mentions.roles.first();
            const puntosSuma = parseInt(args.filter(arg => !arg.includes('<@&') && !isNaN(parseInt(arg)))[0]);

            if (!role || isNaN(puntosSuma)) {
                return message.reply("Error: Usa `!sumar @Rol <puntos>`");
            }

            if (!db[guildId][role.id]) {
                return message.reply("Error: El equipo no está registrado.");
            }

            db[guildId][role.id].puntos += puntosSuma;
            saveDB();

            return message.channel.send(`✅ Se han añadido **${puntosSuma} pts** al equipo ${role}. Total actual: **${db[guildId][role.id].puntos} pts**.`);
        }

        // ==========================================
        // COMANDO ACORTADO: !restar
        // ==========================================
        case 'restar': {
            if (!tienePermiso) return message.reply(MSG_ERROR_PERMISOS);

            const role = message.mentions.roles.first();
            const puntosResta = parseInt(args.filter(arg => !arg.includes('<@&') && !isNaN(parseInt(arg)))[0]);

            if (!role || isNaN(puntosResta)) {
                return message.reply("Error: Usa `!restar @Rol <puntos>`");
            }

            if (!db[guildId][role.id]) {
                return message.reply("Error: El equipo no está registrado.");
            }

            db[guildId][role.id].puntos -= puntosResta;
            saveDB();

            return message.channel.send(`📉 Se han restado **${puntosResta} pts** al equipo ${role}. Total actual: **${db[guildId][role.id].puntos} pts**.`);
        }

        case 'tabla': {
            const listaEquipos = [];
            for (const roleId in db[guildId]) {
                listaEquipos.push({
                    id: roleId,
                    puntos: db[guildId][roleId].puntos,
                    emoji: db[guildId][roleId].emoji || "•"
                });
            }

            listaEquipos.sort((a, b) => b.puntos - a.puntos);

            let cuerpoTabla = "";
            if (listaEquipos.length > 0) {
                listaEquipos.forEach((equipo, index) => {
                    cuerpoTabla += `**#${index + 1}** ${equipo.emoji} <@&${equipo.id}>\n⤷ Puntuación: **${equipo.puntos} pts**\n\n`;
                });
            } else {
                cuerpoTabla = "_No hay equipos registrados todavía._";
            }

            const embed = new EmbedBuilder()
                .setTitle("✦ AMIS OB Y CLASIFICACION ✦")
                .setDescription(cuerpoTabla)
                .setColor("#5865F2")
                .setTimestamp()
                .setFooter({ text: "Tabla General de Posiciones" });

            return message.channel.send({ embeds: [embed] });
        }

        case 'divisiones': {
            const listaEquipos = [];
            for (const roleId in db[guildId]) {
                listaEquipos.push({
                    id: roleId,
                    puntos: db[guildId][roleId].puntos,
                    emoji: db[guildId][roleId].emoji || "•"
                });
            }

            listaEquipos.sort((a, b) => b.puntos - a.puntos);

            let primeraDiv = "";
            let segundaDiv = "";
            let terceraDiv = "";

            const totalEquipos = listaEquipos.length;

            if (totalEquipos > 0) {
                const tamañoCorte = Math.ceil(totalEquipos / 3);

                listaEquipos.forEach((equipo, index) => {
                    const linea = `${equipo.emoji} <@&${equipo.id}> — **${equipo.puntos} pts**\n\n`;
                    
                    if (index < tamañoCorte) {
                        primeraDiv += linea;
                    } else if (index < tamañoCorte * 2) {
                        segundaDiv += linea;
                    } else {
                        terceraDiv += linea;
                    }
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("✦ CLASIFICACIÓN POR DIVISIONES ✦")
                .setDescription("Distribución de equipos en base a su rendimiento actual.")
                .setColor("#2F3136")
                .addFields(
                    { name: "1ra Division", value: primeraDiv || "_No hay equipos en esta division._" },
                    { name: "2da Division", value: segundaDiv || "_No hay equipos en esta division._" },
                    { name: "3ra Division", value: terceraDiv || "_No hay equipos en esta division._" }
                )
                .setTimestamp()
                .setFooter({ text: "Actualizado en tiempo real" });

            return message.channel.send({ embeds: [embed] });
        }
    }
});

client.login(process.env.TOKEN);
