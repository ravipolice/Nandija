"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
                    <h1 className="text-xl font-medium">Terms & Conditions</h1>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-2xl rounded-b-xl bg-white p-6 shadow-md md:p-8">
                <div className="mb-6">
                    <h2 className="mb-2 text-xl font-bold">Employee Consent – Terms & Conditions</h2>
                    <p className="text-sm font-medium text-gray-600">(For Personal/Private App Use)</p>
                </div>

                <p className="mb-6 text-sm leading-relaxed text-gray-700">
                    By submitting my personal information, documents, photographs, or any related data ("Information"), I agree to the following Terms & Conditions:
                </p>

                <Section
                    number="1"
                    title="Voluntary Submission"
                    content="I confirm that all information and documents I provide are true, accurate, and voluntarily submitted for inclusion in the Police Mobile Directory App developed and maintained by the owner of this application."
                />

                <Section
                    number="2"
                    title="Permission to Store & Use My Data"
                    content={`I give consent for the app owner to store, process, and use my information only for the following purposes:

• Creating and maintaining the mobile directory

• Providing quick contact and reference details to authorised app users

• Verification and communication related to directory updates

• Internal management and improvement of the application`}
                />

                <Section
                    number="3"
                    title="Display of Limited Information"
                    content="I allow my non-sensitive details (such as name, designation, unit/station, office mobile number, and profile photo) to be displayed within the app to authorised users only."
                />

                <Section
                    number="4"
                    title="Secure Handling of Data"
                    content={`I understand that the app owner will take reasonable measures to protect my information.

However, no electronic or cloud-based storage (Google Sheets / Google Drive / Firebase / App storage) can guarantee 100% security.`}
                />

                <Section
                    number="5"
                    title="No Unauthorised Sharing"
                    content={`My information will not be sold, shared, or disclosed to any external party except:

• When required by law

• For technical processing within trusted platforms (Google Sheets, Drive, Firebase)`}
                />

                <Section
                    number="6"
                    title="Right to Update or Request Deletion"
                    content="I may request correction or deletion of my information by contacting the app owner or administrator at any time."
                />

                <Section
                    number="7"
                    title="Revoking Consent"
                    content={`I may withdraw my consent at any time.

I understand that withdrawal may result in my data being removed and my details no longer appearing in the directory.`}
                />

                <Section
                    number="8"
                    title="Use of Uploaded Photos/Documents"
                    content={`Any photo or document I upload may be:

• Stored in secure cloud drives (Google Drive / Firebase Storage)

• Linked to the directory

• Used for identification and reference in the app only`}
                />

                <Section
                    number="9"
                    title="App Owner's Rights"
                    content={`The app owner reserves the right to:

• Verify submitted information

• Correct inaccurate entries

• Remove or modify information to maintain accuracy and app performance

• Restrict access for misuse or false information`}
                />

                <Section
                    number="10"
                    title="Acceptance"
                    content="By submitting my data or continuing with the registration/upload process, I acknowledge that I have read, understood, and agree to these Terms & Conditions."
                />

                <div className="h-8"></div>
            </div>
        </div>
    );
}

function Section({ number, title, content }: { number: string; title: string; content: string }) {
    return (
        <div className="mb-4 rounded-lg bg-gray-50 p-4">
            <div className="flex items-baseline gap-2 mb-2">
                <span className="font-bold text-primary-700">{number}.</span>
                <h3 className="font-bold text-gray-900">{title}</h3>
            </div>
            <div className="pl-6 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                {content}
            </div>
        </div>
    );
}
