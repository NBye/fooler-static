const path = require("path");
const fs = require('fs');
const zlib = require("zlib");
exports.gzip = function (source) {
    let sourcePath = path.join(__dirname, source);
    let gzipPath = `${sourcePath}.gz`;
    let gzip = zlib.createGzip();
    let rs = fs.createReadStream(sourcePath);
    let ws = fs.createWriteStream(gzipPath);
    rs.pipe(gzip).pipe(ws);
}

const contentTypes = {
    png: 'image/png',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    html: 'text/html',
    xml: 'text/xml',
    json: 'application/json',
    js: 'application/javascript',
    css: 'text/css',
    tif: 'image/tiff',
    css: 'text/css',
}
exports.sendFile = async function ({ ctx, conf }) {
    let { req, res } = ctx;
    let uri = req.url.split('?')[0];
    let [file, ext] = uri.match(/.*\.(.*)$/);
    file = `${conf.static.path}${uri}`;
    return new Promise((resolve, reject) => {
        fs.access(file, err => {
            if (err) {
                console.log(err);
                ctx.sendHeader('info', err.message);
                ctx.sendHTML('Not Found', 404);
                return resolve();
            }
            let stat = fs.statSync(file);
            let mims = req.headers['if-modified-since'];
            let mtus = (stat.mtime || stat.ctime).toUTCString()
            if (!mims || mims != mtus) {
                res.setHeader("Last-Modified", mtus);
            } else {
                ctx.sendHTML('Not Modified', 304);
                return resolve();
            }
            let encoding = req.headers["accept-encoding"];
            let rs = fs.createReadStream(file);
            let compress, compressType;
            if (encoding && encoding.match(/\bgzip\b/)) {
                compress = zlib.createGzip();
                compressType = "gzip";
            } else if (encoding && encoding.match(/\bdeflate\b/)) {
                compress = zlib.createDeflate();
                compressType = "deflate";
            } else {
                return rs.pipe(res);
            }
            res.setHeader("Content-Encoding", compressType);
            res.setHeader("Content-Type", contentTypes[ext] || 'text/html');
            rs.pipe(compress).pipe(res);
            ctx.completed = true;
            return resolve();
        });
    });
};