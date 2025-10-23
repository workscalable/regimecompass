'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Target, 
  Brain, 
  Shield, 
  Activity, 
  Settings, 
  Menu, 
  X,
  TrendingUp,
  Zap,
  PieChart,
  LineChart,
  Calculator,
  Eye,
  EyeOff
} from 'lucide-react';

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className = '' }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: BarChart3,
      description: 'Main trading dashboard'
    },
    {
      name: 'Options',
      href: '/options',
      icon: Target,
      description: 'Options trading interface'
    },
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: PieChart,
      description: 'Portfolio management'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: LineChart,
      description: 'Advanced analytics'
    },
    {
      name: 'Trading',
      href: '/trading',
      icon: TrendingUp,
      description: 'Trading orchestration'
    },
    {
      name: 'Signals',
      href: '/signals',
      icon: Zap,
      description: 'Signal monitoring'
    },
    {
      name: 'Monitoring',
      href: '/monitoring',
      icon: Activity,
      description: 'System monitoring'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Desktop Navigation */}
      <nav className={`hidden lg:flex lg:flex-col lg:space-y-2 ${className}`}>
        <div className="flex items-center space-x-2 mb-6">
          <Brain className="h-8 w-8 text-blue-400" />
          <h1 className="text-xl font-bold">RegimeCompass</h1>
        </div>
        
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-900/20 text-blue-400 border border-blue-800/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
                {active && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-gray-900">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-400" />
              <h1 className="text-xl font-bold">RegimeCompass</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-900/20 text-blue-400 border border-blue-800/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  {active && (
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
