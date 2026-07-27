async function testSubmitApp() {
    try {
        const payload = {
            jobId: 'job_1',
            jobTitle: 'Senior Full Stack Developer',
            companyEmail: 'hr@techcorp.com',
            companyName: 'TechCorp Solutions',
            seekerEmail: 'joshitha@gmail.com',
            seekerName: 'Joshitha',
            coverLetter: 'I am excited to apply for this job.',
            resume: 'data:application/pdf;base64,JVBERi0xLjQK...',
            cgpa: '8.5',
            certification: '',
            address: '123 Main St',
            city: 'Hyderabad',
            state: 'Telangana',
            experienceYears: '3',
            qualification: "Bachelor's Degree",
            expectedSalary: '12'
        };

        const response = await fetch('http://localhost:5000/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('API RESPONSE STATUS:', response.status);
        console.log('API RESPONSE DATA:', data);

    } catch (err) {
        console.error('FETCH ERROR:', err);
    }
}

testSubmitApp();
