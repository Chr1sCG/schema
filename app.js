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
    
    if (token != null) {
        const options = { headers: { 'Authorization': 'Token ' + token } };
        let response = await got.post('https://acme.fibery.io/api/commands', options);

        if (response.statusCode === 200) {
            if (req.body.fields.wsname) {
            
                return res.json({
                    name: `${req.body.fields.wsname}`
                });
    
            }
            return res.json({
                name: 'Schema'
            });
        }
    }
    res.status(401).json({message: `Invalid access token`});
        
}));

const syncConfig = require(`./config.sync.json`);
app.post(`/api/v1/synchronizer/config`, (req, res) => res.json(syncConfig));

const schema = require(`./schema.json`);
app.post(`/api/v1/synchronizer/schema`, (req, res) => res.json(schema));

app.post(`/api/v1/synchronizer/data`, wrap(async (req, res) => {

    let {requestedType, pagination, account, lastSynchronizedAt, filter} = req.body;
        
    if (requestedType !== `space` && requestedType != `database`) {
        throw new Error(`Only these items can be synchronized`);
    }
    else {
        //const options = { headers: { 'Authorization': 'Token ' + account.wstoken } };
        const response = await got.post(`https://acme.fibery.io/api/commands`,
                                        {
                                            headers: {
                                                'Authorization': 'Token ' + account.wstoken,
                                            },
                                            responseType: `json`,
                                            resolveBodyOnly: false,
                                            method: `post`,
                                            json: [{ "command": "fibery.schema/query" }]
                                        });
        const schema = response.body;
        const dummy = schema[0].result['fibery/types'][0]['fibery/name'];

        const databases = schema[0].result['fibery/types'].filter((t) => (t['fibery/meta']['fibery/domain?'] == true && t['fibery/name'] !== 'fibery/user' && t['fibery/deleted?'] == false)).map((t)=> ({id:t['fibery/id'],spaceName:t['fibery/name'].split('/')[0],name:t['fibery/name'].split('/')[1]}));
        
        if (requestedType == `space`){
            let spaces = [...new Set(databases.map((d) => d.spaceName))];
            
            let items = spaces.map((s) => ({id:uuid(s.spaceName), name:s.spaceName}));
            
            return res.json({items});
        }
        
        else if (requestedType == `database`){
            let items = databases.map((d) => ({id:d.id, name:d.name, space:uuid(d.spaceName)}));
    
            //let items = [{id: uuid("5678"), name: "DummyDatabase", space: uuid("1234")}];

            return res.json({items});
        }
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
