require("dotenv").config();
const { Bot, webhookCallback } = require("grammy");
const instagramGetUrl = require("instagram-url-direct");
const regex = /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_\.]+\/?/;

// Bot

const bot = new Bot(process.env.BOT_TOKEN);

// DB

const mysql = require("mysql2");
const connection = mysql.createConnection(process.env.DATABASE_URL);

// Commands

bot.command("start", async (ctx) => {
  await ctx
    .reply("*Welcome!* ✨ Send an Instagram link.", {
      parse_mode: "Markdown",
    })
    .then(
      connection.query(
        `
SELECT * FROM users WHERE userid = ?
`,
        [ctx.from.id],
        (error, results) => {
          if (error) throw error;
          if (results.length === 0) {
            connection.query(
              `
    INSERT INTO users (userid, username, firstName, lastName, firstSeen)
    VALUES (?, ?, ?, ?, NOW())
  `,
              [
                ctx.from.id,
                ctx.from.username,
                ctx.from.first_name,
                ctx.from.last_name,
              ],
              (error, results) => {
                if (error) throw error;
                console.log("New user added:", ctx.from);
              }
            );
          } else {
            console.log("User exists in database.", ctx.from.id);
          }
        }
      )
    )
    .catch((e) => console.error(e));
});

bot.command("help", async (ctx) => {
  await ctx
    .reply(
      "*@anzubo Project.*\n\n_This bot downloads posts from Instagram.\nSend a link to a post to try it out._",
      { parse_mode: "Markdown" }
    )
    .then(console.log("Help command sent to", ctx.from.id))
    .catch((e) => console.error(e));
});

// Messages

bot.on("msg", async (ctx) => {
  if (!regex.test(ctx.msg.text)) {
    await ctx.reply("*Send an Instagram link.*", {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.msg.message_id,
    });
  } else {
    const status = await ctx.reply("*Downloading*", { parse_mode: "Markdown" });
    setTimeout(async () => {
      await ctx.api.deleteMessage(ctx.chat.id, status.message_id);
    }, 5000);

    try {
      let links = await instagramGetUrl(ctx.msg.text);
      console.log(
        `Query: ${ctx.msg.text}\n` + "Link generated for",
        ctx.from.id
      );
      const url_list = links.url_list;

      if (links.results_number === 1) {
        await ctx.replyWithVideo(links.url_list[0]);
      } else {
        for (let i = 0; i < url_list.length; i++) {
          await ctx.replyWithPhoto(url_list[i]);
        }
      }
    } catch (error) {
      console.error(error);
      await ctx.reply(
        `Post not found!\n_Note: Private accounts are not supported._`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.msg.message_id,
        }
      );
    }
  }
});

// Run

export default webhookCallback(bot, "http");
