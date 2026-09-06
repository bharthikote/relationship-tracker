import { useState } from "react";
import { UserIcon } from "../icons";

interface Props {
  displayName: string;
  onOpenProfile: () => void;
  onSignOut: () => void;
}

export function UserMenu({ displayName, onOpenProfile, onSignOut }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="user-menu">
      <button className="user-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Account menu">
        <UserIcon />
      </button>
      {open && (
        <>
          <div className="user-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="user-menu-dropdown">
            <div className="user-menu-name">{displayName}</div>
            <button
              onClick={() => {
                setOpen(false);
                onOpenProfile();
              }}
            >
              Profile
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
