const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Policy = require('./models/Policy');

dotenv.config();

const seedPolicies = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');

        const policies = [
            {
                role: 'user',
                type: 'terms',
                content: `1. Introduction
Welcome to Agroyilt. These Terms and Conditions govern your use of our platform as a User (Farmer). By registering, you agree to these terms.

2. Account Registration
You must provide accurate information during registration. You are responsible for maintaining the confidentiality of your account credentials.

3. Platform Usage
Agroyilt connects you with equipment owners for agricultural machinery rentals. You agree to use the platform only for lawful purposes.

4. Payments and Bookings
All payments must be processed through the platform. Direct dealings with vendors to bypass platform fees are strictly prohibited.

5. Cancellations and Refunds
Cancellations are subject to the Agroyilt cancellation policy. Refunds will be processed within 5-7 business days.

6. Liability
Agroyilt is not liable for any damages to crops or property caused by rented machinery. We act solely as an intermediary.

7. Modifications
We reserve the right to modify these terms at any time. Continued use implies acceptance.`
            },
            {
                role: 'user',
                type: 'privacy',
                content: `1. Data Collection
We collect your personal information (Name, Email, Phone Number, Location) to provide better services.

2. Usage of Data
Your data is used to process bookings, provide customer support, and improve our platform.

3. Data Sharing
We share your contact details and location with Vendors (Equipment Owners) only when a booking is confirmed. We do not sell your data to third parties.

4. Data Security
We implement industry-standard security measures to protect your personal information from unauthorized access.

5. Your Rights
You have the right to access, modify, or delete your personal data. Contact our support team for assistance.`
            },
            {
                role: 'vendor',
                type: 'terms',
                content: `1. Vendor Agreement
By registering as a Vendor (Equipment Owner), you agree to abide by Agroyilt's terms and provide quality service to farmers.

2. Equipment Listing
All listed machinery must be in good working condition. You are responsible for regular maintenance.

3. Verification
You must provide valid Aadhar, PAN, and any required licenses (e.g., Shop/Lab certificates). False information will lead to account suspension.

4. Payments and Payouts
Agroyilt will deduct applicable platform fees and taxes (including TDS) before remitting payments to your registered bank account. Payouts are processed as per the settlement schedule.

5. Conduct
You agree to communicate professionally with farmers. Any disputes should be reported to Agroyilt support.

6. Account Termination
Agroyilt reserves the right to terminate your account for policy violations, repeated poor ratings, or fraudulent activities.`
            },
            {
                role: 'vendor',
                type: 'privacy',
                content: `1. Information We Collect
We collect business details, identity documents (Aadhar, PAN), bank account information, and location data.

2. How We Use Your Information
Your information is used for identity verification, processing payouts, and displaying your services to potential customers on the Agroyilt platform.

3. Data Disclosure
We may share your information with legal authorities if required by law or for tax compliance purposes.

4. Security
We protect your sensitive business and financial information using advanced encryption and secure servers.

5. Updates
We may update this privacy policy periodically. You will be notified of any significant changes.`
            }
        ];

        for (const policy of policies) {
            await Policy.findOneAndUpdate(
                { role: policy.role, type: policy.type },
                { content: policy.content },
                { upsert: true, new: true }
            );
        }

        console.log('Policies Seeded Successfully');
        process.exit();
    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedPolicies();
