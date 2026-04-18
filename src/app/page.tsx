'use client';

import { useState } from 'react';
import MushafViewer from '@/components/MushafViewer';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import TopicsIndex from '@/components/TopicsIndex';
import BookmarkPanel from '@/components/BookmarkPanel';
import StatsPanel from '@/components/StatsPanel';
import TafsirPanel from '@/components/TafsirPanel';
import QuizPanel from '@/components/QuizPanel';
import VerseOfDayWidget from '@/components/VerseOfDayWidget';
import AudioPlayerBar from '@/components/AudioPlayerBar';
import ShareImagePanel from '@/components/ShareImagePanel';
import AdminDashboard from '@/components/AdminDashboard';
import QiraatPanel from '@/components/QiraatPanel';
import HijriCalendarPanel from '@/components/HijriCalendarPanel';
import VoiceSearchPanel from '@/components/VoiceSearchPanel';
import KidsModePanel from '@/components/KidsModePanel';
import AccessibilityPanel from '@/components/AccessibilityPanel';
import KhatmaPlannerPanel from '@/components/KhatmaPlannerPanel';
import ReflectionsPanel from '@/components/ReflectionsPanel';
import MultiplayerQuizPanel from '@/components/MultiplayerQuizPanel';
import AiTafsirPanel from '@/components/AiTafsirPanel';
import QuranMapPanel from '@/components/QuranMapPanel';
import TopicGraphPanel from '@/components/TopicGraphPanel';
import PublicApiPanel from '@/components/PublicApiPanel';

export type TabKey =
  | 'mushaf'
  | 'topics'
  | 'bookmarks'
  | 'stats'
  | 'tafsir'
  | 'quiz'
  | 'qiraat'
  | 'hijri'
  | 'voice'
  | 'kids'
  | 'a11y'
  | 'khatma'
  | 'reflections'
  | 'mpquiz'
  | 'aitafsir'
  | 'quranmap'
  | 'relations'
  | 'publicapi'
  | 'admin';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('mushaf');
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [tafsirVerse, setTafsirVerse] = useState<{
    surah: number;
    ayah: number;
    text: string;
  } | null>(null);
  const [shareVerse, setShareVerse] = useState<{
    surah: number;
    ayah: number;
    text: string;
    topicColor: string;
    topicId: number;
  } | null>(null);
  const [reflectVerse, setReflectVerse] = useState<{
    surah: number;
    ayah: number;
    text: string;
    topicColor: string;
    topicId: number;
    page: number | null;
  } | null>(null);
  const [aiTafsirVerse, setAiTafsirVerse] = useState<{
    surah: number;
    ayah: number;
    text: string;
    topicColor: string;
    topicId: number;
  } | null>(null);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setActiveTab('mushaf');
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onGoToPage={(page: number) => {
          goToPage(page);
          setSidebarOpen(false);
        }}
        filterTopic={filterTopic}
        onFilterTopic={setFilterTopic}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          currentPage={currentPage}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onPageChange={setCurrentPage}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          role="tabpanel"
          aria-label={activeTab}
        >
          {activeTab === 'mushaf' && (
            <>
              <VerseOfDayWidget onGoToPage={goToPage} />
              <MushafViewer
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                filterTopic={filterTopic}
                onFilterTopic={setFilterTopic}
                onVerseClick={(surah, ayah, text) => {
                  setTafsirVerse({ surah, ayah, text });
                  setActiveTab('tafsir');
                }}
                onShareVerse={(surah, ayah, text, topicColor, topicId) => {
                  setShareVerse({ surah, ayah, text, topicColor, topicId });
                }}
                onReflect={(surah, ayah, text, topicColor, topicId, page) => {
                  setReflectVerse({ surah, ayah, text, topicColor, topicId, page });
                  setActiveTab('reflections');
                }}
                onAiTafsir={(surah, ayah, text, topicColor, topicId) => {
                  setAiTafsirVerse({ surah, ayah, text, topicColor, topicId });
                  setActiveTab('aitafsir');
                }}
              />
            </>
          )}

          {activeTab === 'topics' && (
            <TopicsIndex
              onGoToPage={goToPage}
              onFilterTopic={(color) => {
                setFilterTopic(color);
                setActiveTab('mushaf');
              }}
            />
          )}

          {activeTab === 'bookmarks' && <BookmarkPanel onGoToPage={goToPage} />}
          {activeTab === 'stats' && <StatsPanel onGoToPage={goToPage} />}

          {activeTab === 'tafsir' && tafsirVerse && (
            <TafsirPanel
              surah={tafsirVerse.surah}
              ayah={tafsirVerse.ayah}
              verseText={tafsirVerse.text}
              onClose={() => setActiveTab('mushaf')}
              onNavigate={(surah, ayah) => setTafsirVerse({ surah, ayah, text: '' })}
            />
          )}

          {activeTab === 'tafsir' && !tafsirVerse && (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
              <p className="text-lg text-[var(--color-mushaf-text)]/60">
                اضغط على آية أولًا لعرض التفسير
              </p>
              <button
                onClick={() => setActiveTab('mushaf')}
                className="rounded-lg bg-[var(--color-mushaf-gold)] px-4 py-2 text-white hover:opacity-90"
              >
                العودة للمصحف
              </button>
            </div>
          )}

          {activeTab === 'quiz' && <QuizPanel onGoToPage={goToPage} currentPage={currentPage} />}
          {activeTab === 'qiraat' && <QiraatPanel onGoToPage={goToPage} />}
          {activeTab === 'hijri' && <HijriCalendarPanel onGoToPage={goToPage} />}
          {activeTab === 'voice' && <VoiceSearchPanel onGoToPage={goToPage} />}
          {activeTab === 'kids' && <KidsModePanel onGoToPage={goToPage} />}
          {activeTab === 'a11y' && <AccessibilityPanel />}
          {activeTab === 'khatma' && <KhatmaPlannerPanel onGoToPage={goToPage} />}

          {activeTab === 'reflections' && (
            <ReflectionsPanel onGoToPage={goToPage} verseContext={reflectVerse || undefined} />
          )}

          {activeTab === 'mpquiz' && <MultiplayerQuizPanel onGoToPage={goToPage} />}

          {activeTab === 'aitafsir' && (
            <AiTafsirPanel onGoToPage={goToPage} verseContext={aiTafsirVerse || undefined} />
          )}

          {activeTab === 'quranmap' && <QuranMapPanel onGoToPage={goToPage} />}

          {activeTab === 'relations' && (
            <div className="mx-auto max-w-5xl p-4">
              <h2 className="mb-6 text-center text-lg font-bold text-[var(--color-mushaf-gold)]">
                خريطة العلاقات بين المواضيع والآيات
              </h2>
              <TopicGraphPanel />
            </div>
          )}

          {activeTab === 'publicapi' && <PublicApiPanel />}
          {activeTab === 'admin' && <AdminDashboard onGoToPage={goToPage} />}
        </main>

        <AudioPlayerBar />
      </div>

      {shareVerse && (
        <ShareImagePanel
          surah={shareVerse.surah}
          ayah={shareVerse.ayah}
          text={shareVerse.text}
          topicColor={shareVerse.topicColor}
          topicId={shareVerse.topicId}
          onClose={() => setShareVerse(null)}
        />
      )}
    </div>
  );
}
