import type {Metadata} from "next";import "./globals.css";import {Navbar} from "@/components/Navbar";import {Footer} from "@/components/Footer";
export const metadata:Metadata={title:{default:"Enorsis | AI Procurement Operating System",template:"%s | Enorsis"},description:"AI-powered, multi-tenant Procurement-as-a-Service for global organizations.",icons:{icon:"/icon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Navbar/>{children}<Footer/></body></html>}
