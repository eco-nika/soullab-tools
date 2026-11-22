export const metadata = { title: "소울랩 출강 문의 회신 자동 작성기", description: "회신 작성기와 소울랩 테스트 스토어",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};
export default function Layout({children}: {children: React.ReactNode}) { return <html lang="ko"><body>{children}</body></html>; }
