'use client';
import { useEffect } from 'react';

export default function RootErrorPage({ error, reset }) {
    useEffect(() => { console.error(error); }, [error]);

    return <div>
        <h1>Something has gone wrong!</h1>
        <button onClick={() => reset()}>Click here to try again</button>
    </div>;
}