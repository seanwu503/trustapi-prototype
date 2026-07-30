function log(level, message, fields = {}) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        message,
        ...fields
    };

    const line = JSON.stringify(entry);

    if (level === 'error') {
        console.error(line);
        return;
    }

    console.log(line);
}

function info(message, fields) {
    log('info', message, fields);
}

function warn(message, fields) {
    log('warn', message, fields);
}

function error(message, fields) {
    log('error', message, fields);
}

module.exports = {
    info,
    warn,
    error
};
