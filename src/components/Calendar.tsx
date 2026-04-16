import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  parseISO
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Trash2, 
  Calendar as CalendarIcon,
  X,
  Check
} from 'lucide-react';
import { db, collection, query, where, onSnapshot, auth, setDoc, doc, deleteDoc, addDoc } from '../firebase';
import { CalendarEvent } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

interface Props {
  userId: string;
  prefilledEvent?: any;
  onClearPrefilled?: () => void;
}

export default function Calendar({ userId, prefilledEvent, onClearPrefilled }: Props) {
  const { t, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endTime: format(addDays(new Date(), 0), "yyyy-MM-dd'T'HH:mm"),
  });

  useEffect(() => {
    if (prefilledEvent) {
      setNewEvent({
        title: prefilledEvent.title || '',
        description: prefilledEvent.description || '',
        startTime: prefilledEvent.startTime ? format(new Date(prefilledEvent.startTime), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endTime: prefilledEvent.endTime ? format(new Date(prefilledEvent.endTime), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      });
      setIsAddingEvent(true);
      if (prefilledEvent.startTime) {
        setSelectedDate(new Date(prefilledEvent.startTime));
        setCurrentMonth(new Date(prefilledEvent.startTime));
      }
      onClearPrefilled?.();
    }
  }, [prefilledEvent, onClearPrefilled]);

  useEffect(() => {
    const q = query(
      collection(db, 'calendarEvents'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarEvent[];
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [userId]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const onDateClick = (day: Date) => {
    setSelectedDate(day);
    setNewEvent(prev => ({
      ...prev,
      startTime: format(day, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(day, "yyyy-MM-dd'T'HH:mm"),
    }));
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const start = new Date(newEvent.startTime).getTime();
      const end = new Date(newEvent.endTime).getTime();

      await addDoc(collection(db, 'calendarEvents'), {
        userId,
        title: newEvent.title,
        description: newEvent.description,
        startTime: start,
        endTime: end,
        createdAt: Date.now(),
        color: '#ff3333' // Default accent color
      });

      setIsAddingEvent(false);
      setNewEvent({
        title: '',
        description: '',
        startTime: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
      });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'calendarEvents', id));
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-8 py-12 border-b-4 border-ink bg-card-bg">
        <div className="flex items-center gap-6">
          <CalendarIcon size={40} className="text-accent" />
          <h2 className="text-5xl font-bold tracking-tight text-ink uppercase">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-8">
          <button 
            onClick={prevMonth}
            className="p-2 text-ink hover:text-accent transition-all duration-300 group"
          >
            <ChevronLeft size={28} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="text-xl font-bold tracking-tight text-ink hover:text-accent transition-all duration-300"
          >
            {t('today')}
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 text-ink hover:text-accent transition-all duration-300 group"
          >
            <ChevronRight size={28} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 border-b-4 border-ink bg-paper">
        {days.map((day, i) => (
          <div key={i} className="py-6 text-center text-xs font-bold tracking-[0.3em] text-ink-muted border-r-2 border-ink last:border-r-0">
            {day.toUpperCase()}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), cloneDay));
        
        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[140px] p-4 border-r-2 border-b-2 border-ink transition-all cursor-pointer group relative",
              !isSameMonth(day, monthStart) ? "bg-paper/30 opacity-30" : "bg-paper hover:bg-paper/80",
              isSameDay(day, selectedDate) ? "bg-accent/5 ring-4 ring-inset ring-accent/20" : ""
            )}
            onClick={() => onDateClick(cloneDay)}
          >
            <span className={cn(
              "text-lg font-bold tracking-tighter",
              isSameDay(day, new Date()) ? "text-accent" : "text-ink"
            )}>
              {format(day, 'd')}
            </span>
            
            <div className="mt-4 space-y-2">
              {dayEvents.slice(0, 3).map((event, idx) => (
                <div 
                  key={idx} 
                  className="text-[10px] font-bold tracking-widest bg-ink text-paper px-2 py-1 truncate border-l-4 border-accent"
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[8px] font-bold tracking-widest text-ink-muted pl-1">
                  + {dayEvents.length - 3} MORE
                </div>
              )}
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDateClick(cloneDay);
                setIsAddingEvent(true);
              }}
              className="absolute bottom-4 right-4 p-2 bg-ink text-paper opacity-0 group-hover:opacity-100 transition-all hover:bg-accent"
            >
              <Plus size={12} />
            </button>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-ink/5">{rows}</div>;
  };

  const selectedDateEvents = events
    .filter(e => isSameDay(new Date(e.startTime), selectedDate))
    .sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="h-full flex flex-col bg-paper overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto border-x-4 border-ink min-h-full bg-card-bg">
          {renderHeader()}
          
          <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[800px]">
            {/* Calendar Grid */}
            <div className="lg:col-span-3 border-r-4 border-ink">
              {renderDays()}
              {renderCells()}
            </div>

            {/* Daily Schedule Sidebar */}
            <div className="bg-paper p-10 space-y-12">
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-[0.5em] text-ink-muted uppercase">{t('schedule')}</h3>
                <h4 className="text-4xl font-bold text-ink tracking-tight">
                  {format(selectedDate, 'EEEE, MMM do')}
                </h4>
              </div>

              <button 
                onClick={() => setIsAddingEvent(true)}
                className="flex items-center gap-3 text-ink hover:text-accent transition-all duration-300 group"
              >
                <Plus size={24} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
                <span className="font-bold text-xl tracking-tight">{t('addEvent')}</span>
              </button>

              <div className="space-y-6">
                {selectedDateEvents.length === 0 ? (
                  <div className="py-20 text-center border-4 border-ink border-dashed opacity-30">
                    <Clock size={48} className="mx-auto mb-4" />
                    <p className="text-xs font-bold tracking-widest">{t('noEvents')}</p>
                  </div>
                ) : (
                  selectedDateEvents.map(event => (
                    <div key={event.id} className="group p-8 bg-card-bg border-4 border-ink shadow-[8px_8px_0px_0px_var(--color-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all relative">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3 text-accent">
                          <Clock size={16} strokeWidth={3} />
                          <span className="text-xs font-bold tracking-widest">
                            {format(new Date(event.startTime), 'HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
                          </span>
                        </div>
                        <button 
                          onClick={() => deleteEvent(event.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h5 className="text-xl font-bold text-ink mb-2">{event.title}</h5>
                      {event.description && (
                        <p className="text-sm text-ink-muted leading-relaxed font-medium">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {isAddingEvent && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center p-12 z-[100]">
          <div className="bg-card-bg w-full max-w-2xl border-4 border-ink p-16 animate-in fade-in zoom-in-95 duration-200 shadow-[16px_16px_0px_0px_var(--color-shadow)]">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-4xl font-bold text-ink tracking-tight">{t('addEvent')}</h3>
              <button onClick={() => setIsAddingEvent(false)} className="p-2 hover:bg-paper transition-all">
                <X size={32} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-10">
              <div className="space-y-4">
                <label className="text-xs font-bold text-ink tracking-widest opacity-80 uppercase">{t('eventTitle')}</label>
                <input 
                  required
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-transparent border-b-4 border-ink py-4 focus:border-accent outline-none transition-all duration-300 text-2xl font-bold placeholder:text-ink/20"
                  placeholder="e.g. Strategic Planning Session"
                />
              </div>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-ink tracking-widest opacity-80 uppercase">{t('startTime')}</label>
                  <input 
                    required
                    type="datetime-local"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full bg-paper border-4 border-ink p-4 font-bold outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-ink tracking-widest opacity-80 uppercase">{t('endTime')}</label>
                  <input 
                    required
                    type="datetime-local"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full bg-paper border-4 border-ink p-4 font-bold outline-none focus:border-accent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-ink tracking-widest opacity-80 uppercase">{t('description')}</label>
                <textarea 
                  rows={3}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-paper border-4 border-ink p-6 font-bold outline-none focus:border-accent transition-all resize-none"
                  placeholder="Additional intelligence context..."
                />
              </div>

              <div className="flex gap-6 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  className="flex-1 px-8 py-5 bg-paper text-ink-muted border-4 border-ink hover:bg-slate-200 transition-all font-bold text-sm tracking-widest"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-8 py-5 bg-accent text-paper border-4 border-ink hover:bg-accent/80 transition-all font-bold text-sm tracking-widest shadow-[8px_8px_0px_0px_var(--color-shadow)] active:shadow-none active:translate-x-1 active:translate-y-1"
                >
                  {t('saveEvent')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
