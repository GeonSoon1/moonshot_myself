'use client';

import classNames from 'classnames/bind';
import KakaoImage from '@/public/assets/kakao.png';
import GoogleImage from '@/public/assets/google.png';
import NaverImage from '@/public/assets/naver.png';
import FacebookImage from '@/public/assets/facebook.png';
import OAuthProvider from '@/types/OAuthProivder';
import styles from './SocialButton.module.css';
import Image from 'next/image';

const cx = classNames.bind(styles);

const SOCIAL_BUTTON_IMAGE_MAP = {
  [OAuthProvider.GOOGLE]: GoogleImage,
  [OAuthProvider.KAKAO]: KakaoImage,
  [OAuthProvider.NAVER]: NaverImage,
  [OAuthProvider.FACEBOOK]: FacebookImage,
};

const SocialButton = ({ provider }: { provider: OAuthProvider }) => {
  const handleClick = () => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) {
      alert('NEXT_PUBLIC_API_URL이 설정되지 않았어요.');
      return;
    }
    // 백엔드로 이동해서 OAuth 시작
    window.location.href = `${base}/auth/${provider}`;
  };

  return (
    <div
      className={cx(styles.socialButton, provider)}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      style={{ cursor: 'pointer' }}
    >
      <Image
        className={cx(styles.socialButtonImage)}
        src={SOCIAL_BUTTON_IMAGE_MAP[provider]}
        alt={provider}
      />
    </div>
  );
};

export default SocialButton;
