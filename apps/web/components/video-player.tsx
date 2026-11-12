"use client";
import {useCallback,useEffect,useRef,useState,type PointerEvent} from "react";
import {ArrowLeft,List,Maximize2,Pause,Play,RotateCw,Settings2,SkipBack,SkipForward,Subtitles} from "lucide-react";
import Hls from "hls.js";
interface SpeechCue{start:number;end:number;text:string}
function parseVttTime(v:string){const p=v.trim().replace(",",".").split(":");const s=Number(p.pop()?.replace(",",".")||0),m=Number(p.pop()||0),h=Number(p.pop()||0);return h*3600+m*60+s}
function parseWebVttSpeechCues(v:string):SpeechCue[]{return v.replace(/^\uFEFF?WEBVTT[^\n]*\n/i,"").split(/\n{2,}/).flatMap(b=>{const l=b.split(/\n/).map(x=>x.trim()).filter(Boolean),i=l.findIndex(x=>x.includes("-->"));if(i<0)return[];const t=(l[i]||"").split("-->").map(x=>x.trim().split(/\s+/)[0]||""),start=parseVttTime(t[0]||""),end=parseVttTime(t[1]||""),text=l.slice(i+1).join(" ").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g," ").trim();return Number.isFinite(start)&&Number.isFinite(end)&&end>start&&text?[{start,end,text}]:[]})}
interface VideoPlayerProps{url:string;poster?:string;title?:string;startAtSeconds?:number;introStartSeconds?:number;introEndSeconds?:number;introDebugStatus?:string;onProgress?:(s:number,d:number,force?:boolean)=>void;onUserInteraction?:()=>void;rotated?:boolean;backLabel?:string;onBack?:()=>void;onRotate?:()=>void;onOpenEpisodePicker?:()=>void;showNextEpisode?:boolean;onNextEpisode?:()=>void;subtitleSearch?:{title:string;year?:number;tmdbId?:number|string;type?:"movie"|"tv";season?:number;episode?:number}}
export const VideoPlayer=({url,poster,title,startAtSeconds=0,introStartSeconds,introEndSeconds,introDebugStatus="Chưa có trạng thái API",onProgress,onUserInteraction,rotated=false,backLabel="Trở về",onBack,onRotate,onOpenEpisodePicker,showNextEpisode=false,onNextEpisode,subtitleSearch}:VideoPlayerProps)=>{
 const rootRef=useRef<HTMLDivElement>(null),videoRef=useRef<HTMLVideoElement>(null),hlsRef=useRef<Hls|null>(null),introRef=useRef({start:introStartSeconds,end:introEndSeconds}),progressRef=useRef(onProgress),interactionRef=useRef(onUserInteraction),speechCuesRef=useRef<SpeechCue[]>([]),speechEnabledRef=useRef(false),subtitleSelectRef=useRef<(c:any)=>Promise<void>>(async()=>{});
 introRef.current={start:introStartSeconds,end:introEndSeconds};progressRef.current=onProgress;interactionRef.current=onUserInteraction;
 const pointer=useRef<{id:number;x:number;y:number;moved:boolean}|null>(null),lastTap=useRef<{at:number;side:"left"|"right"}|null>(null),tapTimer=useRef<number|null>(null),feedbackTimer=useRef<number|null>(null);
 const [controls,setControls]=useState(true),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[playing,setPlaying]=useState(false),[skipIntro,setSkipIntro]=useState(false),[feedback,setFeedback]=useState<"back"|"forward"|null>(null);
 const [subtitlePanelOpen,setSubtitlePanelOpen]=useState(false),[subtitleCandidates,setSubtitleCandidates]=useState<any[]>([]),[subtitleLoading,setSubtitleLoading]=useState(false),[subtitleError,setSubtitleError]=useState(""),[subtitleDownloading,setSubtitleDownloading]=useState(""),[selectedSubtitle,setSelectedSubtitle]=useState("");
 const [voiceoverEnabled,setVoiceoverEnabled]=useState(false),[voiceoverReady,setVoiceoverReady]=useState(false),[voiceoverStatus,setVoiceoverStatus]=useState(""),[settingsOpen,setSettingsOpen]=useState(false),[rate,setRateState]=useState(1);
 const [debug,setDebug]=useState(()=>{try{return typeof window!=="undefined"&&window.localStorage.getItem("player-skip-intro-debug")==="on"}catch{return false}}),[debugTime,setDebugTime]=useState<number|null>(null),[debugState,setDebugState]=useState("Đang chờ trình phát");
 const isHls=/\.m3u8(?:$|[?#])/i.test(url);
 const fmt=(n:number)=>{if(!Number.isFinite(n)||n<0)return"0:00";const t=Math.floor(n),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return h?h+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"):m+":"+String(s).padStart(2,"0")};
 const seekTo=useCallback((n:number)=>{const v=videoRef.current;if(v&&Number.isFinite(n)){v.currentTime=Math.max(0,Math.min(Number.isFinite(v.duration)?v.duration:n,n));setTime(v.currentTime)}},[]);
 const seekBy=useCallback((d:number)=>{const v=videoRef.current;if(!v)return;v.currentTime=Math.max(0,Math.min(Number.isFinite(v.duration)?v.duration:Infinity,v.currentTime+d));hlsRef.current?.startLoad(v.currentTime);void v.play().catch(()=>{});setTime(v.currentTime);setControls(true)},[]);
 const toggle=()=>{const v=videoRef.current;if(!v)return;if(v.paused)void v.play().catch(()=>{});else v.pause()};
 useEffect(()=>{const v=videoRef.current;if(!v||!url)return;let dead=false,known=0,last=0,stuck=0,stall=0,seekTimer=0,activeCue=-1;
  const cancelVoice=()=>{if("speechSynthesis"in window)window.speechSynthesis.cancel();activeCue=-1};
  const syncVoice=()=>{if(!speechEnabledRef.current||v.paused||v.ended||!("speechSynthesis"in window))return;const i=speechCuesRef.current.findIndex(c=>v.currentTime>=c.start&&v.currentTime<c.end);if(i===activeCue)return;window.speechSynthesis.cancel();activeCue=i;if(i<0)return;const c=speechCuesRef.current[i];if(!c)return;const u=new SpeechSynthesisUtterance(c.text);u.lang="vi-VN";u.rate=1.04;const voice=window.speechSynthesis.getVoices().find(x=>/^vi([_-]|$)/i.test(x.lang));if(voice)u.voice=voice;window.speechSynthesis.speak(u)};
  const update=()=>{const d=Number.isFinite(v.duration)&&v.duration>0?v.duration:known;setTime(v.currentTime||0);if(d>0)setDuration(d);setPlaying(!v.paused&&!v.ended);syncVoice();const a=introRef.current;setSkipIntro(typeof a.start==="number"&&typeof a.end==="number"&&a.end>a.start&&v.currentTime>=a.start&&v.currentTime<a.end);if(debug){setDebugTime(Number(v.currentTime.toFixed(2)));setDebugState((v.paused?"Đang dừng":"Đang phát")+" · readyState "+v.readyState)}if(!v.paused)progressRef.current?.(v.currentTime,d)};
  const final=()=>progressRef.current?.(v.currentTime,Number.isFinite(v.duration)?v.duration:known,true);
  const recover=(at=v.currentTime)=>{try{hlsRef.current?.recoverMediaError();hlsRef.current?.startLoad(at);v.currentTime=at;void v.play().catch(()=>{})}catch{}};
  const loaded=()=>{if(startAtSeconds>0&&v.duration>0)v.currentTime=Math.min(startAtSeconds,Math.max(0,v.duration-2));update();void v.play().catch(()=>setControls(true))};
  const seeking=()=>hlsRef.current?.startLoad(v.currentTime);
  const seeked=()=>{window.clearTimeout(seekTimer);const at=v.currentTime;seekTimer=window.setTimeout(()=>{if(!dead&&!v.paused&&v.readyState<3&&Math.abs(v.currentTime-at)<.35)recover(at)},2500)};
  const paused=()=>{update();final();cancelVoice()};
  v.addEventListener("loadedmetadata",loaded);v.addEventListener("durationchange",update);v.addEventListener("timeupdate",update);v.addEventListener("play",update);v.addEventListener("pause",paused);v.addEventListener("ended",final);v.addEventListener("seeking",seeking);v.addEventListener("seeked",seeked);
  if(isHls&&Hls.isSupported()){const h=new Hls({enableWorker:true,lowLatencyMode:false,backBufferLength:30,maxBufferLength:40,maxMaxBufferLength:80,maxBufferSize:80*1000*1000,maxBufferHole:1.5,nudgeOffset:.2,nudgeMaxRetry:8,fragLoadingMaxRetry:6,fragLoadingRetryDelay:1000,manifestLoadingMaxRetry:4,levelLoadingMaxRetry:4});hlsRef.current=h;h.on(Hls.Events.MANIFEST_PARSED,()=>{if(!dead){if(startAtSeconds>0&&v.duration>0)v.currentTime=Math.min(startAtSeconds,Math.max(0,v.duration-2));void v.play().catch(()=>setControls(true))}});h.on(Hls.Events.LEVEL_LOADED,(_,d)=>{const n=Number(d.details?.totalduration);if(n>0){known=n;setDuration(n)}});h.on(Hls.Events.ERROR,(_,d)=>{if(!d.fatal)return;if(d.type===Hls.ErrorTypes.NETWORK_ERROR)h.startLoad(v.currentTime||0);else if(d.type===Hls.ErrorTypes.MEDIA_ERROR){try{h.recoverMediaError()}catch{h.destroy()}}else h.destroy()});h.loadSource(url);h.attachMedia(v)}
  else if(isHls&&v.canPlayType("application/vnd.apple.mpegurl"))v.src=url;else if(!isHls)v.src=url;else setDebugState("Thiết bị không hỗ trợ HLS");
  stall=window.setInterval(()=>{if(v.paused||v.ended){stuck=0;last=v.currentTime;return}if(Math.abs(v.currentTime-last)<.05)stuck++;else stuck=0;last=v.currentTime;if(stuck>=4){stuck=0;recover()}},1200);
  return()=>{dead=true;window.clearInterval(stall);window.clearTimeout(seekTimer);cancelVoice();v.removeEventListener("loadedmetadata",loaded);v.removeEventListener("durationchange",update);v.removeEventListener("timeupdate",update);v.removeEventListener("play",update);v.removeEventListener("pause",paused);v.removeEventListener("ended",final);v.removeEventListener("seeking",seeking);v.removeEventListener("seeked",seeked);hlsRef.current?.destroy();hlsRef.current=null;v.pause();v.removeAttribute("src");v.load()};
 },[url,startAtSeconds,isHls,debug]);
 useEffect(()=>{if(!playing||subtitlePanelOpen||settingsOpen)return;const t=window.setTimeout(()=>setControls(false),12000);return()=>window.clearTimeout(t)},[playing,controls,subtitlePanelOpen,settingsOpen]);
 useEffect(()=>()=>{if(tapTimer.current)window.clearTimeout(tapTimer.current);if(feedbackTimer.current)window.clearTimeout(feedbackTimer.current)},[]);
 const surfaceDown=(e:PointerEvent<HTMLDivElement>)=>{if((e.target as HTMLElement).closest(".player-ui"))return;pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false}};
 const surfaceMove=(e:PointerEvent<HTMLDivElement>)=>{const p=pointer.current;if(p&&p.id===e.pointerId&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>14)p.moved=true};
 const surfaceUp=(e:PointerEvent<HTMLDivElement>)=>{const p=pointer.current;if(!p||p.id!==e.pointerId)return;pointer.current=null;if(p.moved||(e.target as HTMLElement).closest(".player-ui"))return;interactionRef.current?.();const wasVisible=controls;setControls(true);const r=rootRef.current?.getBoundingClientRect();if(!r)return;const landscape=rotated||window.matchMedia("(orientation: landscape)").matches,side=landscape?(e.clientY<r.top+r.height/2?"left":"right"):(e.clientX<r.left+r.width/2?"left":"right"),now=Date.now(),prev=lastTap.current;if(prev&&now-prev.at<320&&prev.side===side){if(tapTimer.current)window.clearTimeout(tapTimer.current);lastTap.current=null;seekBy(side==="left"?-30:30);setFeedback(side==="left"?"back":"forward");if(feedbackTimer.current)window.clearTimeout(feedbackTimer.current);feedbackTimer.current=window.setTimeout(()=>setFeedback(null),850)}else{lastTap.current={at:now,side};if(tapTimer.current)window.clearTimeout(tapTimer.current);tapTimer.current=window.setTimeout(()=>{if(wasVisible)setControls(false);else setControls(true);lastTap.current=null},300)}};
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(rootRef.current?.requestFullscreen)await rootRef.current.requestFullscreen();else (videoRef.current as HTMLVideoElement&{webkitEnterFullscreen?:()=>void})?.webkitEnterFullscreen?.()}catch{}};
 const changeRate=(n:number)=>{setRateState(n);if(videoRef.current)videoRef.current.playbackRate=n;setSettingsOpen(false)};
  // Tìm danh sách phụ đề SubDL; chỉ tải file khi người xem chọn một bản.
  useEffect(() => {
    if (!subtitleSearch?.title?.trim()) return;

    let cancelled = false;
    const subtitleObjectUrls: string[] = [];
    const attachedTracks: HTMLTrackElement[] = [];
    const loaded: Array<{ key: string; label: string; track: HTMLTrackElement; cues: SpeechCue[] }> = [];
    speechCuesRef.current = [];
    speechEnabledRef.current = false;
    setVoiceoverEnabled(false);
    setVoiceoverReady(false);
    setVoiceoverStatus("");
    setSubtitleCandidates([]);
    setSubtitleLoading(true);
    setSubtitleError("");
    setSelectedSubtitle("");
    subtitleSelectRef.current = async (candidate: any) => {
      const key = String(candidate?.nId || "") + ":" + String(candidate?.fileNId || candidate?.downloadUrl || "");
      const existing = loaded.find((item) => item.key === key);
      if (existing) {
        loaded.forEach((item) => { item.track.track.mode = item === existing ? "showing" : "disabled"; });
        speechCuesRef.current = existing.cues;
        setVoiceoverReady(existing.cues.length > 0);
        setSelectedSubtitle(existing.label);
        return;
      }

      setSubtitleDownloading(key);
      setSubtitleError("");
      try {
        const response = await fetch("/api/subtitles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nId: candidate.nId, fileNId: candidate.fileNId, downloadUrl: candidate.downloadUrl }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || typeof data?.content !== "string") {
          throw new Error(data?.error || "Không tải được phụ đề này.");
        }
        const format = String(candidate.format || "srt").toLowerCase();
        const normalized = data.content
          .replace(/^\uFEFF/, "")
          .replace(/\r\n?/g, "\n")
          .trim();

        const toVttTimestamp = (value: string) => {
          const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
          if (!match) return value.trim();
          const [, hours = "00", minutes = "00", seconds = "00", milliseconds = "000"] = match;
          return `${hours.padStart(2, "0")}:${minutes}:${seconds}.${milliseconds.padEnd(3, "0")}`;
        };

        let vtt = "";
        if (format === "ass" || format === "ssa" || /^\[Script Info\]/im.test(normalized)) {
          const lines = normalized.split("\n");
          let inEvents = false;
          let fields = ["Layer", "Start", "End", "Style", "Name", "MarginL", "MarginR", "MarginV", "Effect", "Text"];
          const cues: string[] = [];
          for (const line of lines) {
            const trimmed = line.trim();
            if (/^\[Events\]$/i.test(trimmed)) {
              inEvents = true;
              continue;
            }
            if (/^\[.+\]$/.test(trimmed)) {
              inEvents = false;
              continue;
            }
            if (!inEvents) continue;
            if (/^Format\s*:/i.test(trimmed)) {
              fields = trimmed.slice(trimmed.indexOf(":") + 1).split(",").map((field: string) => field.trim());
              continue;
            }
            if (!/^Dialogue\s*:/i.test(trimmed)) continue;
            const raw = trimmed.slice(trimmed.indexOf(":") + 1);
            const textIndex = fields.findIndex((field) => field.toLowerCase() === "text");
            const startIndex = fields.findIndex((field) => field.toLowerCase() === "start");
            const endIndex = fields.findIndex((field) => field.toLowerCase() === "end");
            if (textIndex < 0 || startIndex < 0 || endIndex < 0) continue;
            const parts = raw.split(",");
            const values = parts.slice(0, textIndex);
            values.push(parts.slice(textIndex).join(","));
            const start = toVttTimestamp(values[startIndex] || "");
            const end = toVttTimestamp(values[endIndex] || "");
            const caption = (values[textIndex] || "")
              .replace(/\{[^}]*\}/g, "")
              .replace(/\\[Nn]/g, "\n")
              .replace(/\\h/g, " ")
              .replace(/\\\\/g, "\\")
              .trim();
            if (/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(start) &&
                /^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(end) && caption) {
              cues.push(`${start} --> ${end}\n${caption}`);
            }
          }
          vtt = "WEBVTT\n\n" + cues.join("\n\n");
        } else if (/^WEBVTT(?:\s|$)/i.test(normalized)) {
          vtt = normalized;
        } else {
          const cues = normalized
            .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, (_match: string, time: string, millis: string) => `${time}.${String(millis).padEnd(3, "0")}`);
          vtt = "WEBVTT\n\n" + cues;
        }
        if (!/^WEBVTT(?:\s|$)/i.test(vtt) || !/-->/.test(vtt)) {
          throw new Error("File phụ đề không có câu thoại hợp lệ hoặc định dạng không được hỗ trợ.");
        }
        const speechCues = parseWebVttSpeechCues(vtt);
        if (!speechCues.length) {
          throw new Error("Không đọc được mốc thời gian và lời thoại trong phụ đề này.");
        }
        const objectUrl = URL.createObjectURL(new Blob([vtt], { type: "text/vtt;charset=utf-8" }));
        subtitleObjectUrls.push(objectUrl);
        const video = videoRef.current;
        if (!video) throw new Error("Trình phát chưa sẵn sàng.");
        const track = document.createElement("track");
        track.kind = "subtitles";
        track.label = String(candidate.label || candidate.fileName || "Phụ đề tiếng Việt");
        track.srclang = "vi";
        track.src = objectUrl;
        track.default = true;
        video.appendChild(track);
        attachedTracks.push(track);
        const entry = { key, label: track.label, track, cues: speechCues };
        loaded.push(entry);
        speechCuesRef.current = speechCues;
        setVoiceoverReady(true);
        const activateTrack = () => {
          if (cancelled || !video.isConnected) return;
          loaded.forEach((item) => {
            item.track.track.mode = item === entry ? "showing" : "disabled";
          });
          // Safari/iOS đôi khi chỉ cập nhật cue sau khi track đã tải xong.
          if (entry.track.track.mode !== "showing") entry.track.track.mode = "showing";
        };
        track.addEventListener("load", activateTrack, { once: true });
        track.addEventListener("error", () => {
          if (!cancelled) setSubtitleError("Trình duyệt không đọc được file phụ đề này.");
        }, { once: true });
        activateTrack();
        window.setTimeout(activateTrack, 150);
        setSelectedSubtitle(entry.label);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không tải được phụ đề.";
        setSubtitleError(message);
      } finally {
        setSubtitleDownloading("");
      }
    };

    const loadSubtitles = async () => {
      try {
        const params = new URLSearchParams({ title: subtitleSearch.title.trim(), language: "vi" });
        if (subtitleSearch.year) params.set("year", String(subtitleSearch.year));
        if (subtitleSearch.tmdbId) params.set("tmdbId", String(subtitleSearch.tmdbId));
        if (subtitleSearch.type) params.set("type", subtitleSearch.type);
        if (subtitleSearch.type === "tv" && Number.isInteger(subtitleSearch.season) && Number(subtitleSearch.season) > 0) params.set("season", String(subtitleSearch.season));
        if (subtitleSearch.type === "tv" && Number.isInteger(subtitleSearch.episode) && Number(subtitleSearch.episode) > 0) params.set("episode", String(subtitleSearch.episode));

        let response = await fetch("/api/subtitles?" + params.toString());
        let data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Không thể tìm phụ đề SubDL.");
        let candidates = Array.isArray(data?.subtitles) ? data.subtitles : [];
        if (!candidates.length && subtitleSearch.tmdbId) {
          params.delete("tmdbId");
          response = await fetch("/api/subtitles?" + params.toString());
          data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error || "Không thể tìm phụ đề SubDL.");
          candidates = Array.isArray(data?.subtitles) ? data.subtitles : [];
        }
        if (cancelled) return;
        setSubtitleCandidates(candidates);
        if (!candidates.length) setSubtitleError("SubDL không có phụ đề tiếng Việt phù hợp cho phim/tập này.");
      } catch (error) {
        if (!cancelled) setSubtitleError(error instanceof Error ? error.message : "Không thể kết nối SubDL.");
      } finally {
        if (!cancelled) setSubtitleLoading(false);
      }
    };

    void loadSubtitles();
    return () => {
      cancelled = true;
      subtitleSelectRef.current = async () => {};
      attachedTracks.forEach((track) => { if (track.parentNode) track.parentNode.removeChild(track); });
      subtitleObjectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [url, subtitleSearch?.title, subtitleSearch?.year, subtitleSearch?.tmdbId, subtitleSearch?.type, subtitleSearch?.season, subtitleSearch?.episode]);

 return <div ref={rootRef} className="native-player player-controls-frame relative h-full w-full overflow-hidden bg-black text-white" onPointerDown={surfaceDown} onPointerMove={surfaceMove} onPointerUp={surfaceUp} onPointerCancel={()=>{pointer.current=null}}>
  <video ref={videoRef} className="native-player-video absolute inset-0 h-full w-full bg-black object-contain" poster={poster} playsInline preload="metadata" aria-label={title||"Trình phát video"}/>
  {feedback&&<div className={"pointer-events-none absolute inset-y-0 z-20 flex w-1/2 items-center justify-center "+(feedback==="back"?"left-0":"right-0")}><div className="flex flex-col items-center gap-2 rounded-full border border-white/30 bg-white/[.12] px-6 py-5 shadow-2xl backdrop-blur-2xl">{feedback==="back"?<SkipBack size={28}/>:<SkipForward size={28}/>}<b className="text-xl">30 giây</b><span className="text-[10px] font-bold uppercase tracking-widest">{feedback==="back"?"Lùi":"Tiến"}</span></div></div>}
  <div className={"player-ui pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/75 via-black/30 to-transparent px-3 pb-7 pt-3 text-white transition-all duration-200 sm:px-5 sm:pt-4 "+(controls?"translate-y-0 opacity-100":"-translate-y-3 opacity-0")}>
   <button type="button" onClick={()=>onBack?.()} aria-label="Quay về trang phim" className="pointer-events-auto flex min-w-0 max-w-[calc(100%-150px)] items-center gap-2 rounded-full border border-white/25 bg-white/[.09] px-3 py-2 text-left text-sm font-semibold backdrop-blur-2xl"><ArrowLeft className="h-5 w-5 shrink-0"/><span className="min-w-0 truncate"><span className="block truncate text-sm font-semibold">{title||backLabel}</span><span className="block text-[11px] font-medium text-white/65">Đang phát · {fmt(time)} / {fmt(duration)}</span></span></button>
   <div className="pointer-events-auto flex shrink-0 items-center gap-2"><button type="button" onClick={()=>onOpenEpisodePicker?.()} aria-label="Chọn tập và máy chủ" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/[.10] backdrop-blur-2xl"><List className="h-5 w-5"/></button><button type="button" onClick={()=>onRotate?.()} aria-label="Xoay ngang hoặc dọc" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/[.10] backdrop-blur-2xl"><RotateCw className="h-5 w-5"/></button></div>
  </div>
  <div className={"player-ui pointer-events-none absolute inset-0 z-30 flex items-center justify-center transition-all duration-200 "+(controls?"opacity-100":"pointer-events-none opacity-0")}>
   <div className="pointer-events-auto flex items-center gap-5 sm:gap-8">
    <button type="button" onClick={()=>seekBy(-30)} aria-label="Lùi 30 giây" className="player-center-skip"><SkipBack size={23}/><span>30</span></button>
    <button type="button" onClick={toggle} aria-label={playing?"Tạm dừng":"Phát"} className="player-center-play">{playing?<Pause size={34} fill="currentColor"/>:<Play size={34} fill="currentColor"/>}</button>
    <button type="button" onClick={()=>seekBy(30)} aria-label="Tiến 30 giây" className="player-center-skip"><SkipForward size={23}/><span>30</span></button>
   </div>
  </div>
  <div className={"player-ui player-custom-dock absolute inset-x-0 bottom-0 z-[45] px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-20 text-white transition-all duration-300 sm:px-7 "+(controls?"translate-y-0 opacity-100":"translate-y-5 opacity-0 pointer-events-none")} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
   <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
    <div className="flex items-center gap-3 px-1"><span className="min-w-[38px] text-[11px] font-semibold tabular-nums text-white">{fmt(time)}</span><input aria-label="Tua video" type="range" min={0} max={Math.max(1,duration)} step={.1} value={Math.min(time,Math.max(1,duration))} onChange={e=>seekTo(Number(e.target.value))} className="player-custom-seek min-w-0 flex-1"/><span className="min-w-[38px] text-right text-[11px] tabular-nums text-white/65">{fmt(duration)}</span></div>
    <div className="flex items-center justify-between gap-2 px-1">
     <div className="flex min-w-0 items-center gap-4">
      <button type="button" onClick={toggle} aria-label={playing?"Tạm dừng":"Phát"} className="player-bottom-action">{playing?<Pause size={21} fill="currentColor"/>:<Play size={21} fill="currentColor"/>}</button>
      {skipIntro&&<button type="button" onClick={()=>{if(typeof introRef.current.end==="number")seekTo(introRef.current.end)}} className="rounded-full border border-white/35 bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl">Bỏ qua intro</button>}
     </div>
     <div className="flex shrink-0 items-center gap-3">
      <button type="button" onClick={()=>setSubtitlePanelOpen(true)} aria-label="Phụ đề" className="player-bottom-action"><Subtitles size={21}/></button>
      {showNextEpisode&&<button type="button" onClick={()=>onNextEpisode?.()} aria-label="Tập tiếp theo" className="player-next-episode"><SkipForward size={18}/><span>Tập tiếp theo</span></button>}
      <button type="button" onClick={()=>void fullscreen()} aria-label="Toàn màn hình" className="player-bottom-action"><Maximize2 size={20}/></button>
      <button type="button" onClick={()=>setSettingsOpen(x=>!x)} aria-label="Cài đặt phát" className="player-bottom-action"><Settings2 size={20}/></button>
     </div>
    </div>
   </div>
  </div>
  {settingsOpen&&<div className="player-ui absolute bottom-28 right-4 z-[75] w-48 rounded-2xl border border-white/15 bg-black/75 p-3 shadow-2xl backdrop-blur-2xl"><p className="mb-2 text-xs font-bold text-white/60">Tốc độ phát</p>{[.5,.75,1,1.25,1.5,2].map(n=><button key={n} type="button" onClick={()=>changeRate(n)} className={"mb-1 flex w-full justify-between rounded-xl px-3 py-2 text-sm "+(rate===n?"bg-white/15 text-white":"text-white/75 hover:bg-white/10")}>{n}x {rate===n?"✓":""}</button>)}</div>}
  {subtitlePanelOpen&&<div className="player-ui absolute inset-0 z-[80] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:p-5" onClick={()=>setSubtitlePanelOpen(false)}><section role="dialog" aria-modal="true" aria-label="Chọn phụ đề" className="max-h-[82%] w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-[#111018]/95 text-white shadow-2xl" onClick={e=>e.stopPropagation()}>
   <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><b>Chọn phụ đề</b><p className="mt-1 text-xs text-white/55">Nguồn SubDL · Tiếng Việt</p></div><button type="button" onClick={()=>setSubtitlePanelOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xl">×</button></div>
   <div className="max-h-[min(58vh,480px)] overflow-y-auto p-3">
    <button type="button" disabled={!voiceoverReady} onClick={()=>{const on=!speechEnabledRef.current;speechEnabledRef.current=on;setVoiceoverEnabled(on);if(!on){if("speechSynthesis"in window)window.speechSynthesis.cancel();setVoiceoverStatus("Đã tắt thuyết minh");return}if(!("speechSynthesis"in window)){speechEnabledRef.current=false;setVoiceoverEnabled(false);setVoiceoverStatus("Trình duyệt không hỗ trợ đọc văn bản");return}setVoiceoverStatus("Đang thuyết minh bằng giọng có sẵn trên thiết bị");const v=videoRef.current;if(v&&!v.paused)v.dispatchEvent(new Event("timeupdate"))}} className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-left text-sm disabled:opacity-40"><span><b className="block">Thuyết minh tiếng Việt</b><small className="mt-1 block text-xs text-white/55">{voiceoverStatus||(voiceoverReady?"Đọc lời thoại bằng giọng có sẵn trên thiết bị":"Chọn phụ đề tiếng Việt trước")}</small></span><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">{voiceoverEnabled?"ĐANG BẬT":"TẮT"}</span></button>
    <button type="button" onClick={()=>{const v=videoRef.current;if(v)Array.from(v.querySelectorAll("track")).forEach(t=>{t.track.mode="disabled"});setSelectedSubtitle("");setSubtitlePanelOpen(false)}} className="mb-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-left text-sm"><span><b className="block">Tắt phụ đề</b><small className="mt-1 block text-xs text-white/45">Không hiển thị phụ đề</small></span>{!selectedSubtitle&&<span className="text-white">✓</span>}</button>
    {subtitleLoading&&<div className="px-4 py-8 text-center text-sm text-white/65">Đang tìm phụ đề trên SubDL…</div>}
    {!subtitleLoading&&subtitleCandidates.map((c,i)=>{const key=String(c.nId||"")+":"+String(c.fileNId||c.downloadUrl||""),label=String(c.label||c.fileName||"Phụ đề tiếng Việt");return <button key={key||i} type="button" disabled={Boolean(subtitleDownloading)} onClick={async()=>{await subtitleSelectRef.current(c);if(!subtitleError)setSubtitlePanelOpen(false)}} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-left hover:border-white/40 disabled:opacity-60"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[10px] font-black text-white">{String(c.format||"SUB").toUpperCase()}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{label}</b><small className="mt-1 block text-xs text-white/45">{c.fileName||"Phụ đề tiếng Việt"} · SubDL</small></span>{subtitleDownloading===key?<small>Đang tải…</small>:selectedSubtitle===label?<span className="text-white">✓</span>:<span>›</span>}</button>})}
    {subtitleError&&<div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{subtitleError}</div>}{!subtitleLoading&&!subtitleCandidates.length&&!subtitleError&&<div className="px-4 py-8 text-center text-sm text-white/55">Chưa có phụ đề để hiển thị.</div>}
   </div><div className="border-t border-white/10 px-5 py-3 text-xs text-white/40">Chọn một bản để tải và phát trực tiếp trong player.</div>
  </section></div>}
  {debug&&<div className="absolute left-2 top-2 z-40 max-w-[min(92%,420px)] rounded-lg border border-cyan-300/40 bg-black/90 p-2.5 text-[10px] text-white"><b className="text-cyan-300">DEBUG SKIP INTRO</b><div>API: {typeof introStartSeconds==="number"&&typeof introEndSeconds==="number"?"ĐÃ NHẬN":"CHƯA NHẬN"}</div><div>{introDebugStatus}</div><div>{debugTime===null?"Chưa có timeupdate":debugTime+"s"} · {debugState}</div></div>}
  <style jsx global>{`
   .native-player{position:relative;width:100%;height:100%;min-width:0;min-height:0;background:#000;isolation:isolate;--player-white:rgba(255,255,255,.96)}
   .native-player-video{display:block;position:absolute;inset:0;width:100%;height:100%;min-width:0;min-height:0;max-width:none;max-height:none;object-fit:contain;visibility:visible;opacity:1;background:#000;z-index:1}
   .native-player video::cue{color:#fff;background:rgba(0,0,0,.72);font-size:1.1em}
   .player-ui{color:#f7f8fa}
   .player-custom-seek{appearance:none;-webkit-appearance:none;width:100%;height:3px;border-radius:999px;outline:none;background:rgba(255,255,255,.42);cursor:pointer;touch-action:pan-x}
   .player-custom-seek::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(255,255,255,.9);box-shadow:0 0 0 4px rgba(255,255,255,.12)}
   .player-custom-seek::-moz-range-thumb{width:10px;height:10px;border-radius:50%;background:#fff;border:1px solid #fff}
   .player-center-play{display:grid;place-items:center;width:78px;height:78px;border-radius:50%;border:1px solid rgba(255,255,255,.56);background:rgba(235,239,244,.18);color:#fff;backdrop-filter:blur(28px) saturate(125%);-webkit-backdrop-filter:blur(28px) saturate(125%);box-shadow:0 10px 36px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.34)}
   .player-center-skip{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:58px;height:58px;border-radius:50%;border:1px solid rgba(255,255,255,.34);background:rgba(220,226,234,.12);color:#fff;backdrop-filter:blur(24px) saturate(120%);-webkit-backdrop-filter:blur(24px) saturate(120%);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
   .player-center-skip span{font-size:10px;font-weight:800;line-height:1}
   .player-bottom-action{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;color:#fff;background:rgba(225,231,238,.11);border:1px solid rgba(255,255,255,.24);backdrop-filter:blur(24px) saturate(120%);-webkit-backdrop-filter:blur(24px) saturate(120%);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
   .player-next-episode{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 14px;border-radius:999px;color:#fff;background:rgba(225,231,238,.13);border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(24px) saturate(135%);-webkit-backdrop-filter:blur(24px) saturate(135%);box-shadow:inset 0 1px 0 rgba(255,255,255,.24),0 5px 18px rgba(0,0,0,.18);font-size:11px;font-weight:700;white-space:nowrap}
   .player-next-episode svg{flex:none;opacity:.95}
   .player-next-episode:active{background:rgba(255,255,255,.22)}
   .native-player .player-ui button{transition:background .18s ease,border-color .18s ease,transform .18s ease}
   .native-player .player-ui button:active{transform:scale(.96)}
   .native-player .player-ui button:focus-visible,.native-player input:focus-visible{outline:2px solid rgba(255,255,255,.85);outline-offset:3px}
   .player-custom-dock:before{content:"";position:absolute;inset:35% 0 0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(0,0,0,.62))}
   .native-player .player-ui [class*="rounded-2xl"][class*="bg-black"]{border:1px solid rgba(255,255,255,.24);background:rgba(28,32,38,.72);backdrop-filter:blur(28px) saturate(125%);-webkit-backdrop-filter:blur(28px) saturate(125%)}
   @media(max-width:600px){.player-center-play{width:68px;height:68px}.player-center-skip{width:49px;height:49px}.player-center-skip svg{width:19px;height:19px}.player-bottom-action{width:37px;height:37px}.player-custom-dock{padding-left:14px!important;padding-right:14px!important}}
  `}</style>
 </div>
};
