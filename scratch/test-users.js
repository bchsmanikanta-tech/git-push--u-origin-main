async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/admin/users');
        const json = await res.json();
        console.log('STATUS:', res.status);
        console.log('USERS COUNT:', json.users ? json.users.length : 'undefined');
        console.log('USERS:', JSON.stringify(json.users, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}
test();
