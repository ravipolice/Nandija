"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900">
            {/* Header */}
            <div className="mx-auto max-w-2xl overflow-hidden rounded-t-xl bg-primary-600 shadow-md">
                <div className="flex items-center px-4 py-3 text-white">
                    <button
                        onClick={() => router.back()}
                        className="mr-3 rounded-full p-1 hover:bg-white/20 active:bg-white/30"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-medium">Privacy Policy</h1>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-2xl rounded-b-xl bg-white p-6 shadow-md md:p-8">
                <div className="mb-6">
                    <h2 className="mb-2 text-xl font-bold">Police Mobile Directory App - Privacy Policy</h2>
                    <p className="text-sm font-medium text-gray-600">Effective Date: 10-02-2026</p>
                </div>

                <p className="mb-6 text-sm leading-relaxed text-gray-700">
                    This privacy policy governs your use of the software application <strong>Police Mobile Directory</strong> ("Application") for mobile devices that was created by Ravikumar J, Nandija Tech Group.
                </p>

                <Section
                    title="User Provided Information"
                    content={`The Application obtains the information you provide when you download and register the Application.

When you register with us and use the Application, you generally provide:
(a) your name, email address, age, user name, password and other registration information;
(b) transaction-related information, such as when you make purchases, respond to any offers, or download or use applications from us;
(c) information you provide us when you contact us for help;
(d) credit card information for purchase and use of the Application, and;
(e) information you enter into our system when using the Application, such as contact information and project management information.`}
                />

                <Section
                    title="Automatically Collected Information"
                    content={`In addition, the Application may collect certain information automatically, including, but not limited to, the type of mobile device you use, your mobile devices unique device ID, the IP address of your mobile device, your mobile operating system, the type of mobile Internet browsers you use, and information about the way you use the Application.`}
                />

                <Section
                    title="Google Sign-In"
                    content={`This app uses Google Sign-In for authentication purposes only. We access your basic profile information (name, email, profile picture) to verify your identity and create your account within our system. We do not post to your Google account or share your personal information with third parties without your consent, except as described in this policy.`}
                />

                <Section
                    title="Does the Application collect precise real time location information of the device?"
                    content={`This Application does not collect precise information about the location of your mobile device.`}
                />

                <Section
                    title="Do third parties see and/or have access to information obtained by the Application?"
                    content={`Only aggregated, anonymized data is periodically transmitted to external services to help us improve the Application and our service. We will share your information with third parties only in the ways that are described in this privacy statement.

We may disclose User Provided and Automatically Collected Information:
• as required by law, such as to comply with a subpoena, or similar legal process;
• when we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request;
• with our trusted services providers who work on our behalf, do not have an independent use of the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy statement.`}
                />

                <Section
                    title="Data Retention Policy, Managing Your Information"
                    content={`We will retain User Provided data for as long as you use the Application and for a reasonable time thereafter. We will retain Automatically Collected information for up to 24 months and thereafter may store it in aggregate. If you'd like us to delete User Provided Data that you have provided via the Application, please contact us at noreply.pmdapp@gmail.com and we will respond in a reasonable time.`}
                />

                <div className="h-8"></div>
            </div>
        </div>
    );
}

function Section({ title, content }: { title: string; content: string }) {
    return (
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
            <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                {content}
            </div>
        </div>
    );
}
