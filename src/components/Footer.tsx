import Link from "next/link";
import { Logo } from "./Logo";
export function Footer(){return <footer className="bg-[#05142f] py-14 text-white"><div className="wide-shell grid gap-10 md:grid-cols-4"><div className="md:col-span-2"><div className="inline-block rounded-xl bg-white px-3 py-2"><Logo/></div><p className="mt-5 max-w-md text-sm leading-6 text-slate-400">The AI-native global procurement operating system, combining software, intelligence and expert execution.</p></div><div><h4 className="font-bold">Company</h4><div className="mt-4 grid gap-3 text-sm text-slate-400"><Link href="/about">About Us</Link><Link href="/careers">Careers</Link><Link href="/pricing">Pricing</Link></div></div><div><h4 className="font-bold">Resources</h4><div className="mt-4 grid gap-3 text-sm text-slate-400"><Link href="/resources/guides">Guides & eBooks</Link><Link href="/resources/publications">Publications</Link><Link href="/platform">Our Platform</Link></div></div></div>
        <div className="footer-legal-links">
          <Link href="/contact">Contact Us</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/accessibility">Accessibility</Link>
        </div>
</footer>}
<Link href="/contact">Contact Us</Link>
