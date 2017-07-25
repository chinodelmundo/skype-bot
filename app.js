const restify = require('restify');
const builder = require('botbuilder');

const request = require('request');
const Xray = require('x-ray');
const x = Xray();

const mongoose = require('mongoose');
const Reminder = require('./models/reminder');
const Reply = require('./models/reply');

var figlet = require('figlet');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URI);
mongoose.connection.on('error', function() {
  console.info('Error: Could not connect to MongoDB. Did you forget to run `mongod`?');
});

const commands = ['images', 'define', 'choose', 'reminders', 'replies', 'exodia', 'birthday'];

//=========================================================
// Bot Setup
//=========================================================
// Setup Restify Server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 8080, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
const connector = new builder.ChatConnector({
    appId: process.env.appId,
    appPassword: process.env.appPassword
});
const bot = new builder.UniversalBot(connector);
server.post('/', connector.listen());
//Bot on
bot.on('contactRelationUpdate', function (message) {
    if (message.action === 'add') {
        const name = message.user ? message.user.name : null;
        const reply = new builder.Message()
            .address(message.address)
            .text("Hello %s... Thanks for adding me. Say 'commands' to see the commands available.", name || 'there');
        bot.send(reply);
    }
});

//=========================================================
// Bots Dialogs
//=========================================================
String.prototype.contains = function(content){
    return this.indexOf(content) !== -1;
}

bot.dialog('/', function (session) {
    const message = stripMessage(session);
    const taraList = ['canteen','kanteen','eat','uwi','tara'];
    let taraBool = false;

    taraList.forEach((word) => {
        if(message.toLowerCase().contains(word)){
            taraBool = true;
        }
    });

    const command = message.split(" ")[0].toLowerCase();
    switch(command){
        case 'images':
            sendImages(session);
            break;
        case 'define':
            sendDefinition(session);
            break;
        case 'choose':
            sendChoice(session);
            break;
        case 'reminders':
            processReminder(session);
            break;
        case 'replies':
            processReplies(session);
            break;
        case 'ascii':
            sendAscii(session);
            break;
        case 'birthday':
            sendBirthdayCard(session);
            break;
        case 'exodia':
            sendExodia(session);
            break;
        case 'markdown':
            sendMarkdown(session);
            break;
        case 'commands':
        case 'help':
            session.send("Available Commands: " + commands.join(', '));
            break;
        default:
            if(taraBool){
                session.send('Taraaaaaaaaa!!!');
            }else{
                randomReply(session);
            }
    }
});

const sendImages = (session) => {
    const message = stripMessage(session);

    if(message.split(" ").length > 1){
        const url = 'https://www.googleapis.com/customsearch/v1?key=' + process.env.API_KEY + '&cx=' + process.env.SE_ID + '&q=' + message.split(" ").slice(1).join('+');
        session.send('Fetching images...');
        
        request(url, function (error, response, body) {
            const jsonObject = JSON.parse(body);
            const items = jsonObject.items;
            let images = [];
            let cards = [];

            items.forEach((item) => {
                if(item.pagemap && item.pagemap.cse_image){
                    let src = item.pagemap.cse_image[0].src;

                    if(src.includes('.jpg') && images.length < 5 && !images.includes(src)){
                        if(!src.includes('https')){
                            src = src.replace('http','https');
                        }
                        images.push(src);
                    }
                }
            });

            if(images.length > 0){
                images.forEach((image) => {
                    let card = new builder.HeroCard(session)
                        .images([
                            builder.CardImage.create(session, image)
                        ])
                        .buttons([
                            builder.CardAction.openUrl(session, image, 'Image Link')
                        ]);

                    cards.push(card);
                });

                // create reply with Carousel AttachmentLayout
                const reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);

                session.send(reply);
            }else{
                session.send('No images found.');
            }
        });
    }else{
        session.send("No search term entered. Example: 'images justin bieber' ");
    }
};

const sendDefinition = (session) => {
    const message = stripMessage(session);

    if(message.split(" ").length > 1){
        const url = 'https://www.merriam-webster.com/dictionary/' + message.split(" ")[1].toLowerCase();

        x(url, {
            list: x('.definition-list', [{
                li: x('.definition-inner-item', [{
                    span: ['span']
                }])
            }])
        })(function(err, obj) {
            if(err){
                console.log(err);
            }else{
                if(obj.list.length > 1){
                    obj.list[0].li.forEach((item, index) => {
                        let definition = (index + 1) + '\t';
                        item.span.forEach((span) => {
                            if(span != ':'){
                                definition += span + '\n\n  \t\t';
                            }
                        });
                        definition += '\n\n';
                        session.send(definition);
                    });
                }else{
                    session.send('No definition found.');
                }
            }
        });
    }else{
        session.send("No word entered. Example 'define cat'");
    }
};

const sendChoice = (session) => {
    const message = stripMessage(session);

    if(message.split(" ").length > 1){
        const choices = message.replace('choose','').split(",");
        const index = Math.floor(Math.random() * (choices.length));
        session.send(choices[index].trim());
    }else{
        session.send("No choices entered. Example 'choose Jollibee, Mcdo, Burger King'");
    }
};

const sendBirthdayCard = (session) => {
    const message = stripMessage(session);

    if(message.split(" ").length > 1){
        const card = new builder.HeroCard(session)
            .title('Happy Birthday ' + message.split(" ").slice(1).join(' ') + '!!')
            .text('Pizza naman jan!!')
            .images([
                builder.CardImage.create(session, 'http://nycbirthdaycakes.com/wp-content/uploads/2015/11/birthday-cake-images-5.jpg')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://media.giphy.com/media/3o7qE2VAxuXWeyvJIY/giphy.gif', 'Parteh Parteh')
            ]);

        const msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
    }else{
        session.send("No name entered. Example 'birthday John Doe'");
    }
};

const sendExodia = (session) => {
    const head = [
            new builder.HeroCard(session)
                .images([
                    builder.CardImage.create(session, 'https://vignette2.wikia.nocookie.net/yugioh/images/d/dc/ExodiatheForbiddenOne-LDK2-EN-C-1E.png')
                ])
        ];
    const arms = [
        new builder.HeroCard(session)
            .images([
                builder.CardImage.create(session, 'https://vignette2.wikia.nocookie.net/yugioh/images/1/11/RightArmoftheForbiddenOne-LDK2-EN-C-1E.png')
            ]),
        new builder.HeroCard(session)
            .images([
                builder.CardImage.create(session, 'https://vignette1.wikia.nocookie.net/yugioh/images/6/6b/LeftArmoftheForbiddenOne-LDK2-EN-C-1E.png')
            ])
    ];
    const legs = [
        new builder.HeroCard(session)
            .images([
                builder.CardImage.create(session, 'https://vignette2.wikia.nocookie.net/yugioh/images/f/f1/RightLegoftheForbiddenOne-LDK2-EN-C-1E.png')
            ]),
        new builder.HeroCard(session)
            .images([
                builder.CardImage.create(session, 'https://vignette4.wikia.nocookie.net/yugioh/images/f/f5/LeftLegoftheForbiddenOne-LDK2-EN-C-1E.png')
            ])
    ];

    const headReply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(head);

    const armsReply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(arms);

    const legsReply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(legs);

    session.send(headReply);
    session.send(armsReply);
    session.send(legsReply);
};

const processReminder = (session) => {
    const message = stripMessage(session);

    if(message.split(" ").length > 1){
        const action = message.split(" ")[1].toLowerCase();

        switch(action){
            case 'show':
                showReminders(session);
                break;
            case 'add':
                addReminder(session);
                break;
            case 'remove':
                removeReminder(session);
                break;
            default:
                session.send("Unrecognized action. Available actions: show, add, remove");
        }
    }else{
        session.send("No action entered. Examples 'reminders show', 'reminders add buy pizza', 'reminders remove 1'");
    }
};

const showReminders = (session) => {
    const userId = session.message.user.id;

    session.send("Fetching reminders...");
    try{
        Reminder.findOne({ 'userId': userId }, function(err, reminder) {
            if (err){
                console.log(err);
            }else{
                if(reminder){
                    if(reminder.list.length > 0){
                        reminder.list.forEach((item, index) => {
                            session.send((index + 1) + ". " + item);
                        });
                    }else{
                        session.send("You don't have any reminders.");
                        session.send("To add reminders, send 'reminders add buy pizza'");
                    }
                }else{
                    session.send("You don't have any reminders.");
                    session.send("To add reminders, send 'reminders add buy pizza'");
                }
            } 
        });
    }catch(e){
        console.log(e);
        session.send("Error on fetching reminders.");
    }
};

const addReminder = (session) => {
    const message = stripMessage(session);
    const userId = session.message.user.id;
    const reminderText = message.split(" ").slice(2).join(' ');

    if(reminderText){
        try{
            Reminder.findOne({ 'userId': userId }, function(err, reminder) {
                if (err){
                    console.log(err);
                }else{
                    if(reminder){
                        reminder.list.push(reminderText);
                    }else{
                        reminder = new Reminder({
                            userId: userId,
                            list: [reminderText]
                        });
                    }

                    reminder.save(function(err) {
                        if(err){
                            console.log(err);
                            session.send("Error on saving reminder.");
                        }else{
                            session.send("Reminder Added: " + reminderText);
                        }
                    });
                } 
            });
        }catch(e){
            console.log(e);
            session.send("Error on adding reminder.");
        }
    }else{
        session.send("Specify which reminder to add. Example: 'reminders add buy pizza'");
    }
};

const removeReminder = (session) => {
    const message = stripMessage(session);
    const userId = session.message.user.id;
    const index = message.split(" ")[2];

    if(index){
        if(!isNaN(index)){
            try{
                Reminder.findOne({ 'userId': userId }, function(err, reminder) {
                    if (err){
                        console.log(err);
                    }else{
                        if(reminder){
                            if(reminder.list[index - 1]){
                                let reminderText = reminder.list[index - 1];
                                reminder.list.splice(index - 1, 1);

                                reminder.save(function(err) {
                                    if(err){
                                        console.log(err);
                                        session.send("Error on saving reminder.");
                                    }else{
                                        session.send("Reminder Removed: " + reminderText);
                                    }
                                });
                            }else{
                                session.send("You have no reminder with number: " + index);
                            }
                        }else{
                            session.send("You have no reminders.");
                        }
                    } 
                });
            }catch(e){
                console.log(e);
                session.send("Error on removing reminder.");
            }
        }else{
            session.send("Specify the number of the reminder to be removed. Example 'reminders remove 2'");
        }
    }else{
        session.send("Specify which reminder to remove. Example: 'reminders remove 1'");
    }
};

const processReplies = (session) => {
    const message = stripMessage(session);

    if(message.split(" ").length > 1){
        const action = message.split(" ")[1].toLowerCase();

        switch(action){
            case 'show':
                showReplies(session);
                break;
            case 'add':
                addReply(session);
                break;
            case 'remove':
                removeReply(session);
                break;
            default:
                session.send("Unrecognized action. Available actions: show, add, remove");
        }
    }else{
        session.send("No action entered. Examples 'replies show', 'replies add hello friends', 'replies remove 1'");
    }
};

const showReplies = (session) => {
    session.send("Fetching replies...");

    try{
        Reply.findOne({}, function(err, replies) {
            if (err){
                console.log(err);
            }else{
                if(replies){
                    if(replies.list.length > 0){
                        replies.list.forEach((reply, index) => {
                            session.send((index + 1) + ". " + reply);
                        });
                    }else{
                        session.send("No replies retrieved.");
                        session.send("To add replies, send 'replies add hello guys'");
                    }
                }else{
                    session.send("No replies retrieved.");
                    session.send("To add replies, send 'replies add hello guys'");
                }
            }
        });
    }catch(e){
        console.log(e);
        session.send("Error on fetching replies.");
    }
};

const addReply = (session) => {
    const message = stripMessage(session);
    const replyText = message.split(" ").slice(2).join(' ');

    if(replyText){
        try{
            Reply.findOne({}, function(err, replies) {
                if (err){
                    console.log(err);
                }else{
                    if(replies){
                        replies.list.push(replyText);
                    }else{
                        replies = new Reply({
                            list: [replyText]
                        });
                    }

                    replies.save(function(err) {
                        if(err){
                            console.log(err);
                            session.send("Error on saving reply.");
                        }else{
                            session.send("Reply Added: " + replyText);
                        }
                    });
                } 
            });
        }catch(e){
            console.log(e);
            session.send("Error on adding reply.");
        }
    }else{
        session.send("Specify the reply to add. Example: 'replies add hello guys'");
    }
};

const removeReply = (session) => {
    const message = stripMessage(session)
    const index = message.split(" ")[2];

    if(index){
        if(!isNaN(index)){
            try{
                Reply.findOne({}, function(err, replies) {
                    if (err){
                        console.log(err);
                    }else{
                        if(replies){
                            if(replies.list[index - 1]){
                                let replyText = replies.list[index - 1];
                                replies.list.splice(index - 1, 1);

                                replies.save(function(err) {
                                    if(err){
                                        console.log(err);
                                        session.send("Error on updating replies.");
                                    }else{
                                        session.send("Reply Removed: " + replyText);
                                    }
                                });
                            }else{
                                session.send("You have no reply with number: " + index);
                            }
                        }else{
                            session.send("You have no replies.");
                        }
                    } 
                });
            }catch(e){
                console.log(e);
                session.send("Error on removing reply.");
            }
        }else{
            session.send("Specify the number of the reply to be removed. Example 'replies remove 2'");
        }
    }else{
        session.send("Specify which reply to remove. Example: 'replies remove 1'");
    }
};

const randomReply = (session) => {
    try{
        Reply.findOne({}, function(err, replies) {
            if (err){
                console.log(err);
            }else{
                if(replies){
                    if(replies.list.length > 0){
                        const index = Math.floor(Math.random() * (replies.list.length));
                        session.send(replies.list[index].trim());
                    }else{
                        session.send("To add default replies, send 'replies add hello guys'");
                    }
                }else{
                    session.send("To add default replies, send 'replies add hello guys'");
                }
            } 
        });
    }catch(e){
        console.log(e);
        session.send("i'm broken. Send help... :(");
    }
};

const sendAscii = (session) => {
    const message = stripMessage(session).replace('ascii ','');;

    figlet(message, function(err, data) {
        if (err) {
            session.send("i'm broken. Send help... :(");
        }
        session.send('``` ' + data + ' ```');
    });
};

const sendMarkdown = (session) => {
    let message = stripMessage(session);
    message = message.split(" ").slice(1).join(' ');

    const reply = new builder.Message(session)
        .text(message)
        .textFormat('markdown');

    session.send(reply);
};

const stripMessage = (session) => {
    return session.message.text.replace('@Condoriano ','');
};