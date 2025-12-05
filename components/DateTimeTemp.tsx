import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Thermometer } from 'lucide-react';

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
}

const DateTimeTemp: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Simular datos meteorológicos para Buenos Aires
    // En un caso real, aquí se haría una llamada a una API meteorológica
    const fetchWeather = async () => {
      try {
        // Por ahora simulamos datos, en producción usarías una API real como OpenWeatherMap
        const mockWeatherData: WeatherData = {
          temperature: Math.round(Math.random() * 15 + 15), // 15-30°C randomly
          description: 'Parcialmente nublado',
          humidity: Math.round(Math.random() * 30 + 50) // 50-80%
        };
        
        // Simular un delay de API
        setTimeout(() => {
          setWeather(mockWeatherData);
        }, 1000);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeather({
          temperature: 22,
          description: 'Consultando clima...',
          humidity: 65
        });
      }
    };

    fetchWeather();
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex items-center gap-6 text-sm text-neutral-300 font-mono">
      {/* Fecha y Hora */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-neutral-800/50 px-3 py-1 rounded">
          <Calendar className="w-4 h-4 text-red-400" />
          <span className="text-xs uppercase tracking-wider text-neutral-400">Fecha:</span>
          <span className="text-white font-bold text-xs">
            {formatDate(currentTime)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 bg-neutral-800/50 px-3 py-1 rounded">
          <Clock className="w-4 h-4 text-red-400" />
          <span className="text-xs uppercase tracking-wider text-neutral-400">Hora:</span>
          <span className="text-white font-bold text-xs">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Temperatura en Buenos Aires */}
      <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/30 px-3 py-1 rounded">
        <Thermometer className="w-4 h-4 text-red-400" />
        <span className="text-xs uppercase tracking-wider text-red-400">Buenos Aires:</span>
        {weather ? (
          <span className="text-white font-bold text-xs">
            {weather.temperature}°C • {weather.description}
          </span>
        ) : (
          <span className="text-neutral-500 text-xs">Cargando...</span>
        )}
      </div>
    </div>
  );
};

export default DateTimeTemp;