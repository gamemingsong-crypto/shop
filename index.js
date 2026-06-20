import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

// ==========================================
// 1. WEB SERVER FOR CRON JOB (ระบบเปิดบอท)
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('porkhyunbot is Alive!'));
app.listen(process.env.PORT || 3000, () => {
    console.log('🌐 Web Server is running. Ready for Cron-job.org!');
});

// ==========================================
// 2. DISCORD BOT CONFIGURATION
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// =========================================================
// 📌 [จุดที่ต้องแก้ไข] ใส่ไอดีจากเซิร์ฟเวอร์ดิสคอร์ดของคุณตรงนี้ครับ
// =========================================================
const PAYMENT_CHANNEL_ID = '1511625751609479220'; // ห้องที่ให้ทุกคนส่งรูปสลิปเข้ามา
const SUPPORTER_ROLE_ID  = '1511222754437763105'; // ยศที่จะแจกเมื่อแอดมินกดอนุมัติ
const ADMIN_ROLE_ID      = '1511072295320293546'; // ยศของแอดมินหรือทีมงานที่จะมียกสิทธิ์กดปุ่มได้
const MOD_ROLE_ID        = '1508699693486575707'; // เพิ่มบรรทัดนี้ลงไป
    
client.once('ready', () => {
    console.log(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
});

// ==========================================
// 3. MAIN SHOP MENU (พิมพ์คำสั่ง !shop)
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!shop') {
        const shopEmbed = new EmbedBuilder()
            .setColor('#1a0933') 
            .setTitle('[👑 เลือกชำระและรับยศ Supporter 👑]')
            .setDescription(
    `**[ 💸 ] ยศ 𝓢𝓾𝓹𝓹𝓸𝓻𝓽𝓮𝓻**\n` +
    `\` ราคา 150 บาท \` | ระบบทำรายการอัตโนมัติ 24 ชม.\n\n` +
    
    // 🟠 ตัวอักษรสีส้ม/ทอง (ใช้ฟอร์แมตแบบ fix)
    `\`\`\`fix\n` +
    `ราคาโปรโมชันพิเศษจ่ายครั้งเดียวจบ!\n` +
    `\`\`\`\n` +
    
    // 🟢 ตัวอักษรสีเขียว (ใช้ฟอร์แมตแบบ diff แล้วใส่เครื่องหมาย + ข้างหน้า)
    `\`\`\`diff\n` +
    `+ ได้รับยศ Supporter ทันทีหลังโอนเงิน\n` +
    `+ เข้าถึงห้องลับและสิทธิพิเศษมากมาย\n` +
    `+ กิจกรรมจะได้รางวัล X2\n` +
    `+ ห้องแชทส่วนตัวสำหรับชาวแก็งค์ Supporter\n` +
    `\`\`\``
)
            .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeml6dmRvbzN6a3R0cWc1c29udGxjMzJkcmVhMnR4YmduMnlsMTYxcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Gha9NAanUX26zRO1UP/giphy.gif')
            .setFooter({ text: '🎉 ขอบคุณทุกคนที่สนับสนุนนะครับ 🎊' });

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_subscribe_supporter')
                    .setLabel('👽 สมัครยศ 𝓢𝓾𝓹𝓹𝓸𝓻𝓽𝓮𝓻 👽')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('btn_rules')
                    .setLabel('💬 อ่านเงื่อนไขก่อน')
                    .setStyle(ButtonStyle.Secondary),
            );

        await message.channel.send({ 
            embeds: [shopEmbed], 
            components: [actionButtons] 
        });
    }
});

// ==========================================
// 4. CHANNELS DETECTOR (ระบบตรวจจับรูปสลิปในห้องแชท)
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // ระบบจะทำงานเฉพาะเมื่อมีคนส่งรูปเข้ามาในห้อง Payment กลางที่กำหนดไว้
    if (message.channel.id === PAYMENT_CHANNEL_ID) {
        const attachment = message.attachments.first();
        
        // ถ้าไม่มีรูปภาพแนบมา บอทจะไม่ประมวลผล (ปล่อยให้พิมพ์คุยกันได้ หรือส่งเฉพาะรูปสลิป)
        if (!attachment) return;

        const slipImageUrl = attachment.url;
        const userText = message.content || 'ส่งหลักฐานรูปภาพสลิปโอนเงิน';

        // ❌ นำเอา LINE ลบข้อความ (message.delete) ออกไป เพื่อไม่ให้ Discord ลบไฟล์รูปทิ้งครับ

        // แปลงข้อความเป็น Embed บอทสวยๆ แปะกลับลงไป
        const slipEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('🔔 มีการแจ้งโอนเงินใหม่เข้ามา (ธนาคาร)')
            .setDescription(`**ผู้แจ้งโอน:** <@${message.author.id}> (${message.author.tag})\n**รายละเอียด/เวลา:** ${userText}`)
            .setImage(slipImageUrl) // สั่งดึงรูปภาพมาโชว์ใน Embed
            .setTimestamp();

        // แนบปุ่ม อนุมัติ / ปฏิเสธ ห้อยไอดีของผู้ส่งหลักฐานไว้หลังปุ่ม
        const adminButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`admin_approve_${message.author.id}`)
                    .setLabel('✅ อนุมัติยศ')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`admin_reject_${message.author.id}`)
                    .setLabel('❌ ปฏิเสธ')
                    .setStyle(ButtonStyle.Danger)
            );

        await message.channel.send({ embeds: [slipEmbed], components: [adminButtons] });
    }
});

// ==========================================
// 5. BUTTONS CLICK HANDLER (ระบบจัดการการกดปุ่ม)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // กดปุ่ม สมัคร Supporter จากหน้าเมนูหลัก
    if (interaction.customId === 'btn_subscribe_supporter') {
        
        // 🎨 1. สร้าง Embed สำหรับหน้านี้โดยเฉพาะ
        const paymentMenuEmbed = new EmbedBuilder()
            .setColor('#1a0933') // คุมโทนสีม่วงมืดเหมือนเดิม
            .setTitle('🛒 [ เลือกช่องทางการชำระเงิน ]')
            .setDescription('กรุณาเลือกช่องทางที่คุณสะดวกเพื่อชำระเงินค่าสมัครยศ Supporter (150 บาท) ครับ')
            
            // ✨ [จุดสำคัญ] นำลิงก์ตรงของรูปภาพแบนเนอร์มาใส่ที่นี่ได้เลย!
            .setImage('https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzhyYWFrdmZzdGhyNWNjd3FtcmFqOXBkdnZmNWhkZThsb3h6aGFpOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/KiRZqoyLP0owj3tMPu/giphy.gif') 
            .setFooter({ text: 'porkhyun community' });

        const paymentRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pay_bank_qrcode')
                    .setLabel('🏦 ธนาคาร (QR Code)')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('pay_truewallet')
                    .setLabel('🔸 TrueMoney Wallet')
                    .setStyle(ButtonStyle.Danger) 
            );

        // 🔄 2. เปลี่ยนส่งแบบ embeds แทน content เดิม
        await interaction.reply({
            embeds: [paymentMenuEmbed], // เปลี่ยนมาใช้ Embed ที่ใส่รูปได้
            components: [paymentRow],
            ephemeral: true 
        });
    }

    // กดเลือก ธนาคาร (บอทสร้าง QR Code ส่งให้ดูเฉพาะตัว)
    if (interaction.customId === 'pay_bank_qrcode') {
        const promptpayNumber = process.env.MY_WALLET_NUMBER || '0961945339'; 
        const amount = 150; 
        const qrCodeUrl = `https://promptpay.io/${promptpayNumber}/${amount}.png`;

        const bankEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🏦 พร้อมเพย์ QR Code (ยอดเงิน 150 บาท)')
            .setDescription(
                `**[ 🚀 สแกนเพื่อสมัคร Supporter ]**\n` +
                `ระบบล็อกยอดเงินไว้ให้เรียบร้อยแล้วที่ **${amount} บาท** สามารถสแกนจ่ายได้ทันทีครับ\n\n` +
                `*เมื่อโอนเงินสำเร็จแล้ว กรุณานำรูปภาพสลิปไปอัปโหลดส่งในห้องแชท <#${PAYMENT_CHANNEL_ID}> เพื่อให้แอดมินกดอนุมัติยศให้ครับ*`
            )
            .setImage(qrCodeUrl)
            .setTimestamp();

        await interaction.reply({ embeds: [bankEmbed], ephemeral: true });
    }

    // กดเลือก True Wallet (บอทแสดงหน้าต่างกรอกลิงก์ซองของขวัญ)
    if (interaction.customId === 'pay_truewallet') {
        const walletModal = new ModalBuilder()
            .setCustomId('modal_truewallet')
            .setTitle('🔸 เติมเงินผ่าน TrueMoney Wallet');

        const voucherInput = new TextInputBuilder()
            .setCustomId('wallet_link_input')
            .setLabel('ลิงก์ซองของขวัญ TrueWallet (150 บาท)')
            .setPlaceholder('https://gift.truemoney.com/campaign/?v=xxxxxxxxx')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(voucherInput);
        walletModal.addComponents(firstActionRow);

        await interaction.showModal(walletModal);
    }

    // ปุ่มกดอ่านเงื่อนไข
    if (interaction.customId === 'btn_rules') {
        await interaction.reply({ content: '💬 **เงื่อนไข:** การสมัคร Supporter มีอายุการใช้งานถาวร และไม่สามารถขอคืนเงินได้ทุกกรณี', ephemeral: true });
    }

    // --------------------------------------------------
    // ระบบตรวจสอบสิทธิ์ในการกดอนุมัติ (เฉพาะยศแอดมินเท่านั้น)
    // --------------------------------------------------
    
    // แอดมินกดปุ่ม อนุมัติยศ
    if (interaction.customId.startsWith('admin_approve_')) {
    // ดักสิทธิ์: คนกดต้องมีสิทธิ์ยศ ADMIN_ROLE_ID หรือ MOD_ROLE_ID
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID) && !interaction.member.roles.cache.has(MOD_ROLE_ID)) {
        return await interaction.reply({ content: '❌ เฉพาะแอดมินหรือผู้ดูแลระบบที่มียศกำหนดเท่านั้นที่มีสิทธิ์กดอนุมัติครับ!', ephemeral: true });
    }

        const userId = interaction.customId.split('_')[2];
        const guild = interaction.guild;
        const member = await guild.members.fetch(userId).catch(() => null);

        if (!member) {
            return await interaction.reply({ content: '❌ ไม่พบผู้ใช้คนนี้ในเซิร์ฟเวอร์แล้ว', ephemeral: true });
        }

        await member.roles.add(SUPPORTER_ROLE_ID)
            .then(async () => {
                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('#00ff00')
                    .setTitle('✅ อนุมัติยศสำเร็จเรียบร้อยแล้ว')
                    .setDescription(interaction.message.embeds[0].description + `\n\n**ผู้ตรวจสอบ:** <@${interaction.user.id}>`);
                
                // อัปเดต Embed ข้อความเดิมให้เปลี่ยนเป็นสีเขียวและเอาปุ่มออกเพื่อกันกดซ้ำ
                await interaction.update({ embeds: [updatedEmbed], components: [] });
                await member.send('🎉 **สมัครสมาชิก Supporter สำเร็จ!** แอดมินได้อนุมัติยศให้คุณเรียบร้อยแล้ว ขอให้สนุกครับ!').catch(() => null);
            })
            .catch(async (err) => {
                console.error(err);
                await interaction.reply({ content: '❌ บอทไม่มีสิทธิ์แจกยศนี้ กรุณาตั้งค่าสิทธิ์ลำดับยศ (Role Hierarchy) ของบอทให้สูงกว่ายศที่จะแจกในระบบ Discord ครับ', ephemeral: true });
            });
    }

    // แอดมินกดปุ่ม ปฏิเสธ
    if (interaction.customId.startsWith('admin_reject_')) {
    
    // 💡 ปรับให้ MOD_ROLE_ID มีสิทธิ์กดปุ่มปฏิเสธได้ด้วยแบบนี้ครับ
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID) && !interaction.member.roles.cache.has(MOD_ROLE_ID)) {
        return await interaction.reply({ 
            content: '❌ เฉพาะแอดมินหรือผู้ดูแลระบบที่มียศกำหนดเท่านั้นที่มีสิทธิ์กดปฏิเสธครับ!', 
            ephemeral: true 
        });
    }

        const userId = interaction.customId.split('_')[2];
        const guild = interaction.guild;
        const member = await guild.members.fetch(userId).catch(() => null);

        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#ff0000')
            .setTitle('❌ รายการโอนเงินนี้ถูกปฏิเสธ')
            .setDescription(interaction.message.embeds[0].description + `\n\n**ผู้ปฏิเสธ:** <@${interaction.user.id}>`);
        
        await interaction.update({ embeds: [updatedEmbed], components: [] });

        if (member) {
            await member.send('❌ รายการแจ้งโอนเงินของคุณถูกปฏิเสธเนื่องจากข้อมูลไม่ถูกต้อง กรุณาติดต่อแอดมินเพื่อตรวจสอบอีกครั้งครับ').catch(() => null);
        }
    }
});

// ==========================================
// 6. TRUEWALLET MODAL SUBMIT (ระบบออโต้ตัดซองของวอลเล็ต)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'modal_truewallet') {
        await interaction.deferReply({ ephemeral: true });
        const walletLink = interaction.fields.getTextInputValue('wallet_link_input');
        const voucherCode = walletLink.split('?v=')[1] || walletLink;

        if (!voucherCode) {
            return await interaction.editReply({ content: '❌ รูปแบบลิงก์ซองของขวัญไม่ถูกต้อง กรุณาตรวจสอบอีกครั้งครับ' });
        }

        try {
            const phoneNumber = process.env.MY_WALLET_NUMBER;
            const response = await fetch(`https://gift.truemoney.com/campaign/v1/vouchers/${voucherCode}/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phoneNumber, voucher_hash: voucherCode })
            });

            const result = await response.json();

            if (result.status.code === 'SUCCESS') {
                const amountReceived = parseFloat(result.data.voucher.redeemed_amount_baht);

                if (amountReceived >= 150) {
                    const member = interaction.member;
                    if (member) {
                        await member.roles.add(SUPPORTER_ROLE_ID).catch(err => console.log(err));
                    }

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🎉 สมัครสมาชิก Supporter สำเร็จ!')
                        .setDescription(`ระบบได้รับเงินจำนวน **${amountReceived} บาท** เรียบร้อยแล้ว\n\n*บอทได้แจกยศให้คุณเข้าสู่กลุ่ม **Supporter** อัตโนมัติเรียบร้อย ขอให้สนุกครับ!*`)
                        .setTimestamp();

                    await interaction.editReply({ embeds: [successEmbed] });
                } else {
                    await interaction.editReply({ content: `⚠️ ยอดเงินในซองของขวัญไม่ครบ 150 บาท (ได้รับมา ${amountReceived} บาท) กรุณาติดต่อแอดมินครับ` });
                }
            } else {
                await interaction.editReply({ content: `❌ ไม่สามารถรับเงินได้: ${result.status.description || 'ซองหมดอายุหรือถูกใช้ไปแล้ว'}` });
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในระบบ TrueMoney กรุณาลองใหม่ภายหลัง' });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
