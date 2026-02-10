"use client";

import { Mail, Phone, Code, Server, Database, Globe } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-foreground mb-6">Contact & Developer Information</h1>

            {/* Contact Information Section */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                    <Phone className="mr-2 h-5 w-5 text-primary" />
                    Contact Us
                </h2>
                <div className="space-y-4 text-foreground/80">
                    <p>
                        For any support, feedback, or inquiries regarding the Police Mobile Directory application, please feel free to reach out to us.
                    </p>
                    <div className="flex flex-col space-y-2 mt-4">
                        <div className="flex items-center space-x-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <a href="mailto:support@policemobiledirectory.com" className="text-blue-600 hover:underline">
                                support@policemobiledirectory.com
                            </a>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <a href="tel:+919876543210" className="text-blue-600 hover:underline">
                                +91 98765 43210
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Developer Information Section */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                    <Code className="mr-2 h-5 w-5 text-primary" />
                    Developer Information
                </h2>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Developer Profile */}
                        <div className="flex-1 space-y-3 text-foreground/80">
                            <p>
                                This application was designed and developed with a focus on usability, performance, and modern web standards.
                            </p>
                            <div className="mt-4 border-t border-border pt-4">
                                <h3 className="font-medium text-foreground">Technical Stack</h3>
                                <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-muted-foreground">
                                    <li>Frontend: Next.js (React)</li>
                                    <li>Styling: Tailwind CSS</li>
                                    <li>Backend: Firebase (Firestore, Auth)</li>
                                    <li>Deployment: Vercel</li>
                                </ul>
                            </div>
                        </div>

                        {/* Credits / Team */}
                        <div className="flex-1 bg-secondary/20 rounded-lg p-5">
                            <h3 className="font-medium text-foreground mb-3">Developed By</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="font-bold text-foreground">Tech Solutions Team</p>
                                    <p className="text-sm text-muted-foreground">Lead Developer</p>
                                </div>
                                <div className="flex space-x-4 pt-2">
                                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                        <Globe className="h-5 w-5" />
                                    </a>
                                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
