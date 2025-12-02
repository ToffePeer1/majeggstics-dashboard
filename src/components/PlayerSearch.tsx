import React, { useState, useRef, useEffect } from 'react';

interface PlayerSearchProps {
  players: Array<{ label: string; discordId: string }>;
  onSelect: (discordId: string) => void;
  label?: string;
  placeholder?: string;
}

export default function PlayerSearch({ 
  players, 
  onSelect, 
  placeholder = 'Type player name or paste Discord ID...'
}: PlayerSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter players based on input
  const filteredPlayers = inputValue.trim()
    ? players.filter(player => 
        player.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        player.discordId.includes(inputValue)
      )
    : players;

  // Check if input is a valid Discord ID (numeric string, typically 17-19 digits)
  const isDiscordId = (value: string): boolean => {
    return /^\d{17,19}$/.test(value.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (discordId: string) => {
    const player = players.find(p => p.discordId === discordId);
    setInputValue(player?.label || discordId);
    setIsOpen(false);
    onSelect(discordId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (highlightedIndex >= 0 && highlightedIndex < filteredPlayers.length) {
        // Select highlighted option
        handleSelect(filteredPlayers[highlightedIndex].discordId);
      } else if (isDiscordId(inputValue)) {
        // Direct Discord ID input
        handleSelect(inputValue.trim());
      } else if (filteredPlayers.length === 1) {
        // Single match, select it
        handleSelect(filteredPlayers[0].discordId);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredPlayers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmitDirectId = () => {
    if (isDiscordId(inputValue)) {
      handleSelect(inputValue.trim());
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="input"
            style={{ width: '100%', padding: '0.75rem' }}
            autoComplete="off"
          />
          
          {/* Dropdown list */}
          {isOpen && filteredPlayers.length > 0 && (
            <ul
              ref={listRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                maxHeight: '300px',
                overflowY: 'auto',
                background: 'var(--color-bg-primary, #fff)',
                border: '1px solid var(--color-border, #ddd)',
                borderRadius: '0.5rem',
                marginTop: '0.25rem',
                padding: 0,
                listStyle: 'none',
                zIndex: 100,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              {filteredPlayers.slice(0, 50).map((player, index) => (
                <li
                  key={player.discordId}
                  onClick={() => handleSelect(player.discordId)}
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    background: index === highlightedIndex 
                      ? 'var(--color-bg-hover, #f0f0f0)' 
                      : 'transparent',
                    borderBottom: index < filteredPlayers.length - 1 
                      ? '1px solid var(--color-border-light, #eee)' 
                      : 'none',
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {player.label}
                </li>
              ))}
              {filteredPlayers.length > 50 && (
                <li style={{ 
                  padding: '0.5rem 1rem', 
                  color: 'var(--color-text-muted, #888)',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                }}>
                  ... and {filteredPlayers.length - 50} more (type to filter)
                </li>
              )}
            </ul>
          )}

          {/* No results message */}
          {isOpen && inputValue && filteredPlayers.length === 0 && !isDiscordId(inputValue) && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                padding: '0.75rem 1rem',
                background: 'var(--color-bg-primary, #fff)',
                border: '1px solid var(--color-border, #ddd)',
                borderRadius: '0.5rem',
                marginTop: '0.25rem',
                zIndex: 100,
                color: 'var(--color-text-muted, #888)',
                fontSize: '0.875rem',
              }}
            >
              No players found. Try a different search or paste a Discord ID.
            </div>
          )}
        </div>

        {/* Submit button for direct Discord ID */}
        {isDiscordId(inputValue) && (
          <button
            onClick={handleSubmitDirectId}
            className="button button-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Look up ID
          </button>
        )}
      </div>
    </div>
  );
}
