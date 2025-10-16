import React, { useRef, useState, useEffect } from 'react';
import { DEFAULT_AVATAR_URL } from '../constants.ts';

interface AvatarUploaderProps {
  avatarUrl: string;
  onAvatarChange: (file: File) => void;
  disabled: boolean;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ avatarUrl, onAvatarChange, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(avatarUrl || DEFAULT_AVATAR_URL);

  useEffect(() => {
    setPreviewUrl(avatarUrl || DEFAULT_AVATAR_URL);
  }, [avatarUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAvatarChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <img
          src={previewUrl}
          alt="Assistant Avatar"
          className="w-32 h-32 rounded-full object-cover shadow-md"
        />
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/gif"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleUploadClick}
        disabled={disabled}
        className="bg-base-light hover:bg-base-medium text-text-primary font-bold py-2 px-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm dark:bg-dark-base-medium dark:hover:bg-dark-border-color dark:text-dark-text-primary"
      >
        Upload New Avatar
      </button>
    </div>
  );
};
