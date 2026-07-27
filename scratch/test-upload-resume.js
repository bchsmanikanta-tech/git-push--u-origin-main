const fs = require('fs');
const path = require('path');

async function testUploadResume() {
    try {
        const dummyBuffer = Buffer.from('%PDF-1.4 dummy pdf content for testing');
        const blob = new Blob([dummyBuffer], { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('email', 'joshitha@gmail.com');
        formData.append('resume', blob, 'test_resume.pdf');

        const res = await fetch('http://localhost:5000/api/profile/upload-resume', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        console.log('UPLOAD RESUME STATUS:', res.status);
        console.log('UPLOAD RESUME RESPONSE:', data);
    } catch (err) {
        console.error('TEST ERROR:', err.message);
    }
}

testUploadResume();
