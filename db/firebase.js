const https = require('https');

/**
 * Sends a POST request to the Firebase Auth REST API.
 * @param {string} endpoint - The Firebase Auth endpoint ('signUp' or 'signInWithPassword').
 * @param {object} body - The request body.
 * @returns {Promise<object>} The JSON response from Firebase.
 */
async function firebaseAuthRequest(endpoint, body) {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
        throw new Error("FIREBASE_API_KEY_MISSING");
    }

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${apiKey}`;
    const data = JSON.stringify(body);

    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        const errorMsg = parsed.error ? parsed.error.message : 'Firebase API Error';
                        reject(new Error(errorMsg));
                    }
                } catch (e) {
                    reject(new Error('Invalid response from Firebase'));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Registers a user in Firebase Auth.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>}
 */
async function registerInFirebase(email, password) {
    return firebaseAuthRequest('signUp', {
        email,
        password,
        returnSecureToken: true
    });
}

/**
 * Authenticates a user in Firebase Auth.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>}
 */
async function loginWithFirebase(email, password) {
    return firebaseAuthRequest('signInWithPassword', {
        email,
        password,
        returnSecureToken: true
    });
}

module.exports = { registerInFirebase, loginWithFirebase };
