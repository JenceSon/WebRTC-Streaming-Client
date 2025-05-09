import Link from 'next/link';

export default function RootNotFoundPage() {
    return <div>
        <h1>The requested URL is not found!</h1>
        <Link href="/">Click here to go back to the home page</Link>
    </div>;
}