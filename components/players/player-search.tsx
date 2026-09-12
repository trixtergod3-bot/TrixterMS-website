'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function PlayerSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState('');

  return (
    <form
      className={`player-search${compact ? ' player-search-compact' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        const cleaned = name.trim();
        if (cleaned) router.push(`/character/${encodeURIComponent(cleaned)}`);
      }}
    >
      <label htmlFor={compact ? 'player-search-compact' : 'player-search-page'}>
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">Character name</span>
      </label>
      <input
        autoComplete="off"
        id={compact ? 'player-search-compact' : 'player-search-page'}
        onChange={(event) => setName(event.target.value)}
        placeholder="Search a character"
        type="search"
        value={name}
      />
      <button type="submit">View player</button>
    </form>
  );
}
