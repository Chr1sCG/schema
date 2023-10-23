const express = require(`express`);
const path = require(`path`);
const logger = require(`morgan`);
const wrap = require(`express-async-wrap`);
const _ = require(`lodash`);
const uuid = require(`uuid-by-string`);
const got = require(`got`);

const app = express();

app.use(logger(`dev`));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(function (req, res, next) {
    console.log("Res: ", res);
    next();
});

app.get(`/logo`, (req, res) => res.sendFile(path.resolve(__dirname, `logo.svg`)));

const appConfig = require(`./config.app.json`);
app.get(`/`, (req, res) => res.json(appConfig));

app.post(`/validate`, wrap(async (req, res) => {  
    const token = req.body.fields.wstoken;
    /*
    if (token != null) {
        const options = { headers: { 'Authorization': 'Token ' + token } };
        let response = await got('https://acme.fibery.io/api/commands', options);

        if (response.statusCode === 200) {
            if (req.body.fields.wsname) {
            */
                return res.json({
                    name: `${req.body.fields.wsname}`
                });
    /*
            }
            return res.json({
                name: 'Schema'
            });
        }
    }
    res.status(401).json({message: `Invalid access token`});
    */    
}));

const syncConfig = require(`./config.sync.json`);
app.post(`/api/v1/synchronizer/config`, (req, res) => res.json(syncConfig));

const schema = require(`./schema.json`);
app.post(`/api/v1/synchronizer/schema`, (req, res) => res.json(schema));

app.post(`/api/v1/synchronizer/data`, wrap(async (req, res) => {

    let {requestedType, pagination, account, lastSynchronizedAt, filter} = req.body;
    const options = { headers: { 'Authorization': 'Token ' + account.wstoken } };

    const optionsString = JSON.stringify(options);
        
    if (requestedType !== `space` && requestedType != `database`) {
        throw new Error(`Only these items can be synchronized`);
    }

    
    
    if (requestedType == `space`){
        /*
        var url = 'https://readwise.io/api/v2/highlights';
        let response = await got(url, options);
        let body = JSON.parse(response.body);
        let highlights = body.results;
        
        let next = body.next;
        while (next !== null) {
            response = await got(next, options);
            body = JSON.parse(response.body);
            next = body.next;
            highlights = highlights.concat(body.results);
        }
        */
        
        //let items = highlights.map((h) => ({...h, id: uuid((h.id).toString()), name: (h.text.length > 100 ? h.text.slice(0,97) + "..." : h.text), text: h.text, book: uuid((h.book_id).toString()), tags: (h.tags).map((t) => t.name)}));
        let items = [{id: uuid("1234"), name: optionsString }];
        return res.json({items});
    }
    
    else if (requestedType == `database`){
        /*
        var url = 'https://readwise.io/api/v2/books';
        let response = await got(url, options);
        let body = JSON.parse(response.body);
        let books = body.results;

        let next = body.next;
        while (next !== null) {
            response = await got(next, options);
            body = JSON.parse(response.body);
            next = body.next;
            books = books.concat(body.results);
        }
        */

        let items = [{id: uuid("5678"), name: "DummyDatabase", space: uuid("1234")}];
        //let items = books.map((b) => ({...b, id: uuid((b.id).toString()), name: b.title, tags: (b.tags).map((t) => t.name)}));
        return res.json({items});
    }
}));

app.use(function (req, res, next) {
    const error = new Error(`Not found`);
    error.status = 404;
    next(error);
});

app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    console.log(err);
    res.json({message: err.message, code: err.status || 500});
});

module.exports = app;
