'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import Reveal from './Reveal';
import KaTeXHtml from './KaTeXHtml';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type VLMItem = {
  analysis?: {
    question?: string;
    type?: string;
    choice1?: string | null;
    choice2?: string | null;
    choice3?: string | null;
    choice4?: string | null;
    choice5?: string | null;
    refer?: string | null;
  };
  latency_ms?: number;
  storage_key?: string;
};

interface VLMResultsViewerProps {
  results: VLMItem[];
  className?: string;
  executionId?: string;
  durationSeconds?: number;
  onReadyToCompleteChange?: (ready: boolean) => void;
}

export function VLMResultsViewer({ results, className = '', executionId, durationSeconds, onReadyToCompleteChange }: VLMResultsViewerProps) {
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasSeenLast, setHasSeenLast] = useState(false);

  const storageKeys = useMemo(() => Array.from(new Set((results || []).map(r => r.storage_key).filter(Boolean) as string[])), [results]);

  useEffect(() => {
    storageKeys.forEach(async (key) => {
      if (!key) return;
      if (imageUrls[key] || loading[key]) return;
      setLoading(prev => ({ ...prev, [key]: true }));
      try {
        const url = await apiClient.getFileUrl(key);
        setImageUrls(prev => ({ ...prev, [key]: url }));
        setErrors(prev => ({ ...prev, [key]: '' }));
      } catch (e) {
        setErrors(prev => ({ ...prev, [key]: 'Failed to load image' }));
      } finally {
        setLoading(prev => ({ ...prev, [key]: false }));
      }
    });
  }, [storageKeys]);

  const flaggedCount = flagged.size;
  const totalCount = results.length;

  const copyText = async (text: string) => {
    try {
      // Try permission-aware clipboard-write first
      if ((navigator as any)?.permissions?.query) {
        try {
          const perm = await (navigator as any).permissions.query({ name: 'clipboard-write' as any });
          // proceed regardless of state; some browsers return 'prompt'
        } catch {}
      }
      if (typeof window !== 'undefined' && (navigator as any)?.clipboard) {
        const cb = (navigator as any).clipboard;
        if (cb.writeText) {
          await cb.writeText(text);
          return true;
        }
        if (cb.write && (window as any).ClipboardItem) {
          const item = new (window as any).ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) });
          await cb.write([item]);
          return true;
        }
      }
    } catch (_) {}
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) return true;
    } catch (_) {}
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      const span = document.createElement('span');
      span.textContent = text;
      document.body.appendChild(span);
      range.selectNode(span);
      sel?.removeAllRanges();
      sel?.addRange(range);
      const ok = document.execCommand && document.execCommand('copy');
      sel?.removeAllRanges();
      document.body.removeChild(span);
      if (ok) return true;
    } catch (_) {}
    return false;
  };

  const [copyFallbackOpen, setCopyFallbackOpen] = useState(false);
  const [lastPayload, setLastPayload] = useState('');

  const goPrev = () => {
    if (totalCount === 0) return;
    setCurrentIndex((i) => (i - 1 + totalCount) % totalCount);
  };
  const goNext = () => {
    if (totalCount === 0) return;
    setCurrentIndex((i) => (i + 1) % totalCount);
  };
  const toggleFlag = (idx: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Keyboard shortcuts: F -> next, D -> previous, Q -> toggle ineligible on current
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore when focusing inputs/textarea
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (copyFallbackOpen) return;
      // ignore during IME composition and when modifier keys (except Shift) are pressed
      if ((e as any).isComposing) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === 'KeyF') {
        e.preventDefault();
        goNext();
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        goPrev();
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        if (viewMode === 'single') toggleFlag(currentIndex);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyFallbackOpen, viewMode, currentIndex, totalCount]);

  // Track if last item has been seen at least once
  useEffect(() => {
    if (totalCount === 0) return;
    if (currentIndex === totalCount - 1 && !hasSeenLast) {
      setHasSeenLast(true);
    }
  }, [currentIndex, totalCount, hasSeenLast]);

  // Notify parent when readiness changes
  useEffect(() => {
    onReadyToCompleteChange?.(hasSeenLast || totalCount === 0);
  }, [hasSeenLast, totalCount]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn(
        /* position */ 'sticky top-0 z-20',
        /* layout */ 'flex items-center justify-between',
        /* surface */ 'border-b bg-background/90 backdrop-blur',
        /* spacing */ 'px-3 py-2'
      )}>
        <div className={cn('flex items-center gap-3')}>
          <div className={cn('text-sm font-medium')}>문항 요약</div>
          <div className={cn('text-xs text-muted-foreground hidden md:block')}>
            단축키: F 다음, D 이전, Q 부적합 토글
          </div>
        </div>
        <div className={cn('flex items-center gap-2')}>
          <div className={cn('text-sm')}>
            <span className={cn('font-medium')}>부적합</span>
            <span className={cn('mx-1')}>[</span>
            <span className={cn('text-red-600 dark:text-red-400 font-semibold')}>{flaggedCount}</span>
            <span className={cn('mx-1')}>/</span>
            <span className={cn('text-muted-foreground')}>{totalCount}</span>
            <span className={cn('mx-1')}>]</span>
          </div>
          <div className={cn('w-px h-4 bg-border mx-1')} />
          <div className={cn('flex items-center gap-1')}>
            <Button size="sm" variant={viewMode === 'single' ? 'default' : 'outline'} onClick={() => setViewMode('single')}>단문항</Button>
            <Button size="sm" variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>그리드</Button>
          </div>
        </div>
      </div>

      {viewMode === 'single' ? (
        <div className={cn('space-y-3')}>
          <div className={cn('flex items-center justify-between')}>
            <div className={cn('text-sm text-muted-foreground')}>{totalCount > 0 ? `${currentIndex + 1} / ${totalCount}` : '0 / 0'}</div>
            <div className={cn('flex items-center gap-2')}>
              <Button size="sm" variant="outline" onClick={goPrev}>이전 (D)</Button>
              <Button size="sm" variant="outline" onClick={() => toggleFlag(currentIndex)}>{flagged.has(currentIndex) ? '부적합 해제' : '부적합'}</Button>
              <Button size="sm" onClick={goNext}>다음 (F)</Button>
            </div>
          </div>
          {totalCount > 0 && (() => {
            const idx = currentIndex;
            const item = results[idx];
            const a = item?.analysis || {};
            const choices = [a.choice1, a.choice2, a.choice3, a.choice4, a.choice5].filter(Boolean) as string[];
            const key = item?.storage_key || '';
            const src = key ? imageUrls[key] : '';
            const isLoading = key ? loading[key] : false;
            const error = key ? errors[key] : '';
            const isFlagged = flagged.has(idx);
            return (
              <article className={cn(
                'border rounded-lg bg-background p-4 flex flex-col gap-3',
                isFlagged && 'border-red-300 bg-red-50 dark:bg-red-950/20'
              )}>
                <header className={cn('flex items-start justify-between gap-2')}>
                  <div className={cn('text-sm font-medium')}>문항 {idx + 1}</div>
                  <div className={cn('flex items-center gap-2')}>
                    <Button size="sm" variant={isFlagged ? 'destructive' : 'outline'} onClick={() => toggleFlag(idx)}>부적합</Button>
                    {item?.latency_ms != null && (
                      <div className={cn('text-xs text-muted-foreground')}>{Math.round(item.latency_ms)} ms</div>
                    )}
                  </div>
                </header>
                <div
                  className={cn('grid', 'gap-4', 'justify-center')}
                  style={{ gridTemplateColumns: 'minmax(220px,35%) minmax(220px,35%)' }}
                >
                  <section className={cn('border rounded-md overflow-hidden')}>
                    <div className={cn('px-2 py-1 text-xs font-medium bg-gray-50 dark:bg-gray-900/40 border-b')}>원본 이미지</div>
                    <div className={cn('bg-muted/20 flex items-start justify-center min-h-40')}>
                      {!key ? (
                        <div className={cn('text-xs text-muted-foreground p-3 text-center')}>No source image</div>
                      ) : isLoading ? (
                        <div className={cn('text-xs text-muted-foreground p-3')}>Loading...</div>
                      ) : error ? (
                        <div className={cn('text-xs text-red-600 p-3')}>{error}</div>
                      ) : src ? (
                        <img src={src} alt={key} className={cn('w-full h-full object-contain')} />
                      ) : null}
                    </div>
                  </section>
                  <section className={cn(
                    /* surface */ 'border rounded-md overflow-hidden',
                    /* layout */ 'flex flex-col'
                  )}>
                    <div className={cn(
                      /* spacing */ 'px-2 py-1',
                      /* typography */ 'text-xs font-medium text-blue-700 dark:text-blue-300',
                      /* surface */ 'bg-blue-50 dark:bg-blue-950/30 border-b'
                    )}>결과</div>
                    <div className={cn(
                      /* surface */ 'bg-blue-50/40 dark:bg-blue-950/20',
                      /* spacing */ 'p-3',
                      /* typography */ 'text-black dark:text-black',
                      /* layout */ 'flex flex-col items-center justify-center',
                      /* overflow */ 'overflow-auto max-h-[70vh] flex-1 overflow-y-auto'
                    )}>
                      {a.question && (<KaTeXHtml html={a.question} tick={currentIndex} />)}
                      {a.refer && (<KaTeXHtml html={a.refer} className={cn('border rounded-md p-2 bg-muted/30')} tick={currentIndex + 1} />)}
                      {choices.length > 0 && (
                        <ol className={cn(
                          /* spacing */ 'space-y-2',
                          /* list */ 'list-none pl-0',
                          /* typography */ 'text-black dark:text-black'
                        )}>
                          {choices.map((c, i) => (
                            <li key={i} className={cn(
                              /* layout */ 'flex items-start gap-2'
                            )}>
                              <span className={cn(
                                /* layout */ 'inline-flex items-center justify-center',
                                /* sizing */ 'h-5 w-5',
                                /* surface */ 'rounded-full border border-blue-300 bg-blue-50',
                                /* typography */ 'text-[11px] font-semibold text-blue-700',
                                /* dark mode */ 'dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
                                /* flex */ 'flex-none'
                              )}>{i + 1}</span>
                              <div className={cn(
                                /* prose */ 'prose prose-sm max-w-none',
                                /* typography */ 'text-black dark:text-black'
                              )}>
                                <KaTeXHtml html={c} tick={currentIndex * 10 + i} />
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </section>
                </div>
              </article>
            );
          })()}
        </div>
      ) : (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4')}>
      {results.map((item, idx) => {
        const a = item.analysis || {};
        const choices = [a.choice1, a.choice2, a.choice3, a.choice4, a.choice5].filter(Boolean) as string[];
        const key = item.storage_key || '';
        const src = key ? imageUrls[key] : '';
        const isLoading = key ? loading[key] : false;
        const error = key ? errors[key] : '';
        const isFlagged = flagged.has(idx);
        return (
          <Reveal key={idx}>
          <article className={cn(
            /* surface */ 'border rounded-lg bg-background',
            /* spacing */ 'p-4',
            /* layout */ 'flex flex-col gap-3',
            /* state */ isFlagged && 'border-red-300 bg-red-50 dark:bg-red-950/20'
          )}>
            <header className={cn('flex items-start justify-between gap-2')}>
              <div className={cn('text-sm font-medium')}>문항 {idx + 1}</div>
              <div className={cn('flex items-center gap-2')}>
                <Button
                  size="sm"
                  variant={isFlagged ? 'destructive' : 'outline'}
                  className={cn(
                    /* sizing */ 'h-7 px-2',
                    /* state */ isFlagged && 'bg-red-600 text-white hover:bg-red-700'
                  )}
                  onClick={() => {
                    setFlagged(prev => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx); else next.add(idx);
                      return next;
                    });
                  }}
                >
                  부적합
                </Button>
                {item.latency_ms != null && (
                  <div className={cn('text-xs text-muted-foreground')}>{Math.round(item.latency_ms)} ms</div>
                )}
              </div>
            </header>

            <div
              className={cn(
                /* layout */ 'grid justify-center',
                /* spacing */ 'gap-4'
              )}
              style={{ gridTemplateColumns: 'minmax(220px,35%) minmax(220px,35%)' }}
            >
              {/* Left: Source Image */}
              <section className={cn(
                /* surface */ 'border rounded-md',
                /* layout */ 'overflow-hidden'
              )}>
                <div className={cn(
                  /* layout */ 'px-2 py-1',
                  /* text */ 'text-xs font-medium',
                  /* surface */ 'bg-gray-50 dark:bg-gray-900/40 border-b'
                )}>원본 이미지</div>
                <div className={cn(
                  /* surface */ 'bg-muted/20',
                  /* layout */ 'flex items-center justify-center',
                  /* sizing */ 'min-h-40'
                )}>
                  {!key ? (
                    <div className={cn('text-xs text-muted-foreground p-3 text-center')}>No source image</div>
                  ) : isLoading ? (
                    <div className={cn('text-xs text-muted-foreground p-3')}>Loading...</div>
                  ) : error ? (
                    <div className={cn('text-xs text-red-600 p-3')}>{error}</div>
                  ) : src ? (
                    <img src={src} alt={key} className={cn('w-full h-full object-contain')} />
                  ) : null}
                </div>
              </section>

              {/* Right: Result Content */}
              <section className={cn(
                /* surface */ 'border rounded-md',
                /* layout */ 'overflow-hidden'
              )}>
                <div className={cn(
                  /* layout */ 'px-2 py-1',
                  /* text */ 'text-xs font-medium text-blue-700 dark:text-blue-300',
                  /* surface */ 'bg-blue-50 dark:bg-blue-950/30 border-b'
                )}>결과</div>
                <div className={cn(
                  /* surface */ 'bg-blue-50/40 dark:bg-blue-950/20',
                  /* spacing */ 'p-3',
                  /* text */ 'text-black dark:text-black'
                )}>
                  {a.question && (
                    <KaTeXHtml html={a.question} tick={idx + results.length} />
                  )}

                  {a.refer && (
                    <KaTeXHtml html={a.refer} className={cn('border rounded-md p-2 bg-muted/30')} />
                  )}

                  {choices.length > 0 && (
                    <ol className={cn('space-y-2 list-none pl-0 text-black dark:text-black')}>
                      {choices.map((c, i) => (
                        <li key={i} className={cn('flex items-start gap-2')}>
                          <span
                            className={cn(
                              /* layout */ 'inline-flex items-center justify-center',
                              /* sizing */ 'h-5 w-5',
                              /* shape */ 'rounded-full',
                              /* surface */ 'border border-blue-300 bg-blue-50',
                              /* text */ 'text-[11px] font-semibold text-blue-700',
                              /* dark */ 'dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
                              /* shrink */ 'flex-none'
                            )}
                          >
                            {i + 1}
                          </span>
                          <div className={cn('prose prose-sm max-w-none text-black dark:text-black')}>
                            <KaTeXHtml html={c} tick={idx * 10 + i} />
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            </div>

            {item.storage_key && (
              <footer className={cn('text-xs text-muted-foreground mt-1')}>source: {item.storage_key}</footer>
            )}
          </article>
          </Reveal>
        );
      })}
      </div>
      )}

      {/* Floating action button: 수율 체크 완료 */}
      <div className={cn(
        /* position */ 'fixed right-6 bottom-6 z-40',
        /* layout */ 'flex'
      )}>
        <Button
          className={cn(
            hasSeenLast || totalCount === 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed',
            'h-11 px-5 shadow-lg'
          )}
          disabled={!(hasSeenLast || totalCount === 0)}
          onClick={async (e) => {
            e.preventDefault();
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const date = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
            const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
            // Try to infer execution id from first result storage key path (..../{execution_id}/...)
            const firstKey = results.find(r => r.storage_key)?.storage_key || '';
            const execId = (executionId?.slice(0,8)) || (firstKey.split('/').find((seg) => seg.length >= 8) || '').slice(0,8) || '--------';

            // Counts (객관식/서술형 추정: choice1 존재하면 객관식으로 가정)
            const multiple = results.filter(r => !!(r.analysis?.choice1 || r.analysis?.choice2 || r.analysis?.choice3)).length;
            const subjective = totalCount - multiple;
            const ineligibleIdx = Array.from(flagged).sort((a,b)=>a-b);
            const ineligibleList = ineligibleIdx.map(i => String(i+1)).join(',');
            const yieldPct = totalCount > 0 ? Math.round(((totalCount - ineligibleIdx.length) / totalCount) * 100) : 0;
            const formatDuration = (sec?: number) => {
              if (!sec || sec <= 0) return '[소요시간]';
              const h = Math.floor(sec / 3600);
              const m = Math.floor((sec % 3600) / 60);
              const s = Math.floor(sec % 60);
              if (h > 0) return `${h}h ${m}m ${s}s`;
              if (m > 0) return `${m}m ${s}s`;
              return `${s}s`;
            };
            const durationStr = formatDuration(durationSeconds);

            const payload = `[${date},${time}]
${execId} 수율 체크
1) 전체 문항 ${totalCount}문항 (객관식 ${multiple}, 서술형 ${subjective})
2) 적합 문항 ${totalCount - ineligibleIdx.length}문항
3) 부적합 문항 ${ineligibleIdx.length}문항(${ineligibleList || '-'})
4) 수율 ${yieldPct}%
5) 소요시간: ${durationStr}`;

            // Copy
            setLastPayload(payload);
            // 항상 수동 복사 모달을 먼저 열어 사용자가 확인/복사할 수 있도록 함
            setCopyFallbackOpen(true);
            // 추가적으로 클립보드 복사도 시도 (성공 여부와 무관하게 모달 유지)
            const ok = await copyText(payload);
            if (ok) toast.success('실행 정보가 복사되었습니다. 채널에 공유해주세요', {
              description: (
                <div className={cn('mt-2 font-mono whitespace-pre-wrap text-xs')}>{payload}</div>
              )
            });
            else {
              toast.error('복사에 실패했습니다. 수동 복사 창을 확인해주세요');
            }
          }}
        >
          수율 체크 완료
        </Button>
      </div>

      {/* Copy fallback dialog */}
      <Dialog open={copyFallbackOpen} onOpenChange={setCopyFallbackOpen}>
        <DialogContent className={cn('max-w-xl ')}> 
          <DialogHeader>
            <DialogTitle>수동 복사</DialogTitle>
          </DialogHeader>
          <div className={cn('space-y-2')}>
            <textarea
              value={lastPayload}
              readOnly
              className={cn('w-full h-48 border rounded p-2 font-mono text-sm')}
              onFocus={(e) => { e.currentTarget.select(); }}
            />
            <div className={cn('flex justify-end gap-2')}>
              <Button
                variant="outline"
                onClick={async () => {
                  const ok = await copyText(lastPayload);
                  if (ok) { 
                    toast.success('복사 완료', {
                      description: (
                        <div className={cn('mt-2 font-mono whitespace-pre-wrap text-xs')}>{lastPayload}</div>
                      )
                    });
                    setCopyFallbackOpen(false); 
                  }
                  else toast.error('복사 실패');
                }}
              >
                복사
              </Button>
              <Button onClick={() => setCopyFallbackOpen(false)}>닫기</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VLMResultsViewer;


