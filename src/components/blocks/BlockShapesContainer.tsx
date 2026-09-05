import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Settings2,
  Trash2,
  Copy,
  RotateCw,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Move,
  ArrowUpFromLine,
  ArrowDownToLine,
  AlignCenter,
  RotateCcw,
  Type,
} from 'lucide-react';
import { NoteBlock, ShapeConfig } from '../../types';
import { ShapeSvg } from './ShapeSvg';
import { ShapeCustomizerModal } from '../editor/ShapeCustomizerModal';
import { getBlockShapes, uid } from '../../lib/blocks';
import { useBackButton } from '../../lib/useBackButton';

interface BlockShapesContainerProps {
  block: NoteBlock;
  isEditable?: boolean;
  onUpdateShapes?: (shapes: ShapeConfig[]) => void;
  className?: string;
  alignmentFilter?: 'inline' | 'float'; // to separate floated shapes from inline/block shapes
  layerFilter?: 'all' | 'behind' | 'in-front' | 'inline' | 'float';
  compact?: boolean;
}

type ResizeHandleType = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 's';

interface ActiveResizeState {
  index: number;
  handle: ResizeHandleType;
  startX: number;
  startY: number;
  initWidth: number;
  initHeight: number;
  aspectLocked: boolean;
}

interface ActiveRotateState {
  index: number;
  centerX: number;
  centerY: number;
}

interface ActiveDragState {
  index: number;
  startX: number;
  startY: number;
  initPosX: number;
  initPosY: number;
}

export const BlockShapesContainer: React.FC<BlockShapesContainerProps> = ({
  block,
  isEditable = false,
  onUpdateShapes,
  className = '',
  alignmentFilter,
  layerFilter,
  compact = false,
}) => {
  const [editingShapeIndex, setEditingShapeIndex] = useState<number | null>(null);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
  const [customizerInitialTab, setCustomizerInitialTab] = useState<'shape' | 'size' | 'color' | 'text'>('shape');

  useBackButton(editingShapeIndex !== null, () => setEditingShapeIndex(null), 'shape-customizer-modal');
  
  // Real-time live dimensions during active drag resize
  const [liveResize, setLiveResize] = useState<{ index: number; width: number; height: number } | null>(null);

  // Real-time live rotation during active anchor dragging
  const [liveRotation, setLiveRotation] = useState<{ index: number; deg: number } | null>(null);

  // Real-time live free-form position dragging with finger or mouse
  const [liveDrag, setLiveDrag] = useState<{ index: number; x: number; y: number } | null>(null);

  const resizeStateRef = useRef<ActiveResizeState | null>(null);
  const rotateStateRef = useRef<ActiveRotateState | null>(null);
  const dragStateRef = useRef<ActiveDragState | null>(null);
  const shapeDomRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const shapes = getBlockShapes(block);

  const handleSaveShape = useCallback(
    (updatedShape: ShapeConfig, idx: number) => {
      if (!onUpdateShapes) return;
      const newShapes = [...shapes];
      newShapes[idx] = updatedShape;
      onUpdateShapes(newShapes);
    },
    [shapes, onUpdateShapes]
  );

  const handleDeleteShape = useCallback(
    (idx: number) => {
      if (!onUpdateShapes) return;
      const newShapes = shapes.filter((_, i) => i !== idx);
      onUpdateShapes(newShapes);
      if (selectedShapeIndex === idx) {
        setSelectedShapeIndex(null);
        window.dispatchEvent(new CustomEvent('active-shape-change', { detail: { shapeId: null } }));
      }
    },
    [shapes, onUpdateShapes, selectedShapeIndex]
  );

  const handleDuplicateShape = useCallback(
    (idx: number) => {
      if (!onUpdateShapes) return;
      const shapeToDup = { ...shapes[idx], id: uid('shp') };
      const newShapes = [...shapes];
      newShapes.splice(idx + 1, 0, shapeToDup);
      onUpdateShapes(newShapes);
      setSelectedShapeIndex(idx + 1);
      window.dispatchEvent(new CustomEvent('active-shape-change', { detail: { shapeId: shapeToDup.id } }));
    },
    [shapes, onUpdateShapes]
  );

  // Synchronize single active shape across all note blocks
  useEffect(() => {
    const handleActiveShapeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ shapeId: string | null }>;
      const activeId = customEvent.detail?.shapeId;
      if (!activeId) {
        setSelectedShapeIndex(null);
      } else {
        const foundIdx = shapes.findIndex((s) => s.id === activeId);
        if (foundIdx === -1) {
          setSelectedShapeIndex(null);
        } else {
          setSelectedShapeIndex(foundIdx);
        }
      }
    };

    window.addEventListener('active-shape-change', handleActiveShapeChange);
    return () => {
      window.removeEventListener('active-shape-change', handleActiveShapeChange);
    };
  }, [shapes]);

  // Click or tap anywhere outside to deselect the active shape
  useEffect(() => {
    if (selectedShapeIndex === null) return;

    const handlePointerDownOutside = (e: PointerEvent | MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If interaction is inside a shape, handle, floating toolbar, modal, or toolbar menu, do not deselect
      if (
        target.closest('.shape-item-container') ||
        target.closest('.shape-floating-toolbar') ||
        target.closest('.shape-customizer-modal') ||
        target.closest('[data-shape-interactive]') ||
        target.closest('[data-toolbar]')
      ) {
        return;
      }

      // Empty space tapped/clicked: end shape selection!
      window.dispatchEvent(new CustomEvent('active-shape-change', { detail: { shapeId: null } }));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('active-shape-change', { detail: { shapeId: null } }));
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedShapeIndex]);

  const handleQuickRotate = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const currentRot = shapes[idx]?.rotation || 0;
      const nextRot = (currentRot + 45) % 360;
      handleSaveShape({ ...shapes[idx], rotation: nextRot }, idx);
    },
    [shapes, handleSaveShape]
  );

  const handleResetPosition = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      handleSaveShape({ ...shapes[idx], posX: 0, posY: 0 }, idx);
    },
    [shapes, handleSaveShape]
  );

  // Layer Reordering Handlers (Z-Index / Stack Ordering)
  const handleBringToFront = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onUpdateShapes || idx >= shapes.length - 1) return;
      const newShapes = [...shapes];
      const [item] = newShapes.splice(idx, 1);
      newShapes.push(item);
      onUpdateShapes(newShapes);
      setSelectedShapeIndex(newShapes.length - 1);
    },
    [shapes, onUpdateShapes]
  );

  const handleSendToBack = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onUpdateShapes || idx <= 0) return;
      const newShapes = [...shapes];
      const [item] = newShapes.splice(idx, 1);
      newShapes.unshift(item);
      onUpdateShapes(newShapes);
      setSelectedShapeIndex(0);
    },
    [shapes, onUpdateShapes]
  );

  const handleMoveForward = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onUpdateShapes || idx >= shapes.length - 1) return;
      const newShapes = [...shapes];
      const temp = newShapes[idx];
      newShapes[idx] = newShapes[idx + 1];
      newShapes[idx + 1] = temp;
      onUpdateShapes(newShapes);
      setSelectedShapeIndex(idx + 1);
    },
    [shapes, onUpdateShapes]
  );

  const handleMoveBackward = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onUpdateShapes || idx <= 0) return;
      const newShapes = [...shapes];
      const temp = newShapes[idx];
      newShapes[idx] = newShapes[idx - 1];
      newShapes[idx - 1] = temp;
      onUpdateShapes(newShapes);
      setSelectedShapeIndex(idx - 1);
    },
    [shapes, onUpdateShapes]
  );

  // Drag & Move Start (Touch and Mouse)
  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent, index: number) => {
      if (!isEditable) return;
      const target = e.target as HTMLElement;
      // Don't start drag if clicking on resize handles, rotate handle or toolbar buttons
      if (
        target.closest('.group\\/handle') ||
        target.closest('.group\\/rot') ||
        target.closest('button') ||
        target.closest('input')
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const targetShape = shapes[index];
      const initPosX = liveDrag?.index === index ? liveDrag.x : (targetShape.posX || 0);
      const initPosY = liveDrag?.index === index ? liveDrag.y : (targetShape.posY || 0);

      dragStateRef.current = {
        index,
        startX: clientX,
        startY: clientY,
        initPosX,
        initPosY,
      };

      setLiveDrag({ index, x: initPosX, y: initPosY });
      setSelectedShapeIndex(index);
      if (targetShape?.id) {
        window.dispatchEvent(new CustomEvent('active-shape-change', { detail: { shapeId: targetShape.id } }));
      }
    },
    [isEditable, shapes, liveDrag]
  );

  // Resize Pointer / Touch / Mouse Start
  const startResize = useCallback(
    (e: React.MouseEvent | React.TouchEvent, index: number, handle: ResizeHandleType) => {
      if (!isEditable) return;
      e.preventDefault();
      e.stopPropagation();

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const targetShape = shapes[index];
      const initWidth = liveResize?.index === index ? liveResize.width : (targetShape.width || 220);
      const initHeight = liveResize?.index === index ? liveResize.height : (targetShape.height || 110);

      resizeStateRef.current = {
        index,
        handle,
        startX: clientX,
        startY: clientY,
        initWidth,
        initHeight,
        aspectLocked: Boolean(targetShape.aspectLocked),
      };

      setLiveResize({ index, width: initWidth, height: initHeight });
      setSelectedShapeIndex(index);
      if (targetShape?.id) {
        window.dispatchEvent(new CustomEvent('active-shape-change', { detail: { shapeId: targetShape.id } }));
      }
    },
    [isEditable, shapes, liveResize]
  );

  // 1. Rotation Anchor Handle Start (Top Stem Knob)
  const startRotate = useCallback(
    (e: React.MouseEvent | React.TouchEvent, index: number) => {
      if (!isEditable) return;
      e.preventDefault();
      e.stopPropagation();

      const domNode = shapeDomRefs.current.get(index);
      if (!domNode) return;

      const rect = domNode.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      rotateStateRef.current = {
        index,
        centerX,
        centerY,
      };

      const initialRot = shapes[index]?.rotation || 0;
      setLiveRotation({ index, deg: initialRot });
      setSelectedShapeIndex(index);
      if (shapes[index]?.id) {
        window.dispatchEvent(new CustomEvent('active-shape-change', { detail: { shapeId: shapes[index].id } }));
      }
    },
    [isEditable, shapes]
  );

  // Global mouse & touch move / up listeners for robust dragging across iframe bounds
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // 1. Handle Free Drag Movement (Move shape with finger / mouse)
      if (dragStateRef.current) {
        const state = dragStateRef.current;
        const deltaX = clientX - state.startX;
        const deltaY = clientY - state.startY;

        let newX = Math.round(state.initPosX + deltaX);
        let newY = Math.round(state.initPosY + deltaY);

        // Magnetic snap to 0 if close to original origin
        if (Math.abs(newX) <= 6) newX = 0;
        if (Math.abs(newY) <= 6) newY = 0;

        setLiveDrag({ index: state.index, x: newX, y: newY });
        return;
      }

      // 2. Handle Live Rotation
      if (rotateStateRef.current) {
        const { index, centerX, centerY } = rotateStateRef.current;
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;

        // Angle calculation: 12 o'clock is 0 deg
        let deg = Math.round((Math.atan2(deltaY, deltaX) * 180) / Math.PI) + 90;
        if (deg < 0) deg += 360;
        deg = deg % 360;

        // Snap to 15 degrees if Shift is held or near 45/90/180/270
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
          if (deg >= 360) deg = 0;
        } else {
          // Subtle magnetic snap to cardinal angles (0, 45, 90, 135, 180, 225, 270, 315)
          const cardinal = [0, 45, 90, 135, 180, 225, 270, 315, 360];
          for (const card of cardinal) {
            if (Math.abs(deg - card) <= 3) {
              deg = card % 360;
              break;
            }
          }
        }

        setLiveRotation({ index, deg });
        return;
      }

      // 3. Handle Live Resize
      if (resizeStateRef.current) {
        const state = resizeStateRef.current;
        const deltaX = clientX - state.startX;
        const deltaY = clientY - state.startY;

        let newWidth = state.initWidth;
        let newHeight = state.initHeight;

        // Calculate width & height changes based on handle type
        switch (state.handle) {
          case 'se': // Bottom-Right
            newWidth = state.initWidth + deltaX;
            newHeight = state.initHeight + deltaY;
            break;
          case 'sw': // Bottom-Left
            newWidth = state.initWidth - deltaX;
            newHeight = state.initHeight + deltaY;
            break;
          case 'ne': // Top-Right
            newWidth = state.initWidth + deltaX;
            newHeight = state.initHeight - deltaY;
            break;
          case 'nw': // Top-Left
            newWidth = state.initWidth - deltaX;
            newHeight = state.initHeight - deltaY;
            break;
          case 'e': // Right edge
            newWidth = state.initWidth + deltaX;
            break;
          case 's': // Bottom edge
            newHeight = state.initHeight + deltaY;
            break;
        }

        // Constrain boundaries
        newWidth = Math.max(50, Math.min(850, Math.round(newWidth)));
        newHeight = Math.max(30, Math.min(650, Math.round(newHeight)));

        // Aspect ratio lock handling
        if (state.aspectLocked && state.initWidth > 0 && state.initHeight > 0) {
          const ratio = state.initWidth / state.initHeight;
          if (state.handle === 'e') {
            newHeight = Math.max(30, Math.min(650, Math.round(newWidth / ratio)));
          } else if (state.handle === 's') {
            newWidth = Math.max(50, Math.min(850, Math.round(newHeight * ratio)));
          } else {
            // For corners, balance with width
            newHeight = Math.max(30, Math.min(650, Math.round(newWidth / ratio)));
          }
        }

        setLiveResize({ index: state.index, width: newWidth, height: newHeight });
      }
    };

    const handleEnd = () => {
      // Finalize Free Drag Position
      if (dragStateRef.current) {
        const { index } = dragStateRef.current;
        if (liveDrag && liveDrag.index === index) {
          const shapeToUpdate = shapes[index];
          if (shapeToUpdate) {
            handleSaveShape(
              {
                ...shapeToUpdate,
                posX: liveDrag.x,
                posY: liveDrag.y,
              },
              index
            );
          }
        }
        dragStateRef.current = null;
        setLiveDrag(null);
      }

      // Finalize Rotation
      if (rotateStateRef.current) {
        const { index } = rotateStateRef.current;
        if (liveRotation && liveRotation.index === index) {
          const shapeToUpdate = shapes[index];
          if (shapeToUpdate) {
            handleSaveShape(
              {
                ...shapeToUpdate,
                rotation: liveRotation.deg,
              },
              index
            );
          }
        }
        rotateStateRef.current = null;
        setLiveRotation(null);
      }

      // Finalize Resize
      if (resizeStateRef.current) {
        const { index } = resizeStateRef.current;
        if (liveResize && liveResize.index === index) {
          const shapeToUpdate = shapes[index];
          if (shapeToUpdate) {
            handleSaveShape(
              {
                ...shapeToUpdate,
                width: liveResize.width,
                height: liveResize.height,
              },
              index
            );
          }
        }
        resizeStateRef.current = null;
        setLiveResize(null);
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [liveDrag, liveResize, liveRotation, shapes, handleSaveShape]);

  if (shapes.length === 0) return null;

  // Filter shapes based on layerFilter or alignmentFilter
  const visibleShapes = shapes
    .map((shp, index) => ({ shp, index }))
    .filter(({ shp }) => {
      const isFloat =
        shp.align === 'float-right' ||
        shp.align === 'float-left' ||
        shp.layerPosition === 'float-right' ||
        shp.layerPosition === 'float-left';

      if (layerFilter) {
        if (layerFilter === 'behind') return shp.layerPosition === 'behind';
        if (layerFilter === 'in-front') return shp.layerPosition === 'in-front';
        if (layerFilter === 'float') return isFloat;
        if (layerFilter === 'inline') return !shp.layerPosition || shp.layerPosition === 'inline';
        if (layerFilter === 'all') return true;
      }

      if (alignmentFilter) {
        return alignmentFilter === 'float' ? isFloat : !isFloat;
      }

      return true;
    });

  if (visibleShapes.length === 0) return null;

  return (
    <div className={`block-shapes-wrapper my-2 w-full max-w-full overflow-visible ${className}`}>
      {visibleShapes.map(({ shp, index }) => {
        const isFloatRight = shp.align === 'float-right' || shp.layerPosition === 'float-right';
        const isFloatLeft = shp.align === 'float-left' || shp.layerPosition === 'float-left';
        const isStart = shp.align === 'start';
        const isEnd = shp.align === 'end';
        const isBehind = shp.layerPosition === 'behind';
        const isInFront = shp.layerPosition === 'in-front';

        let alignClasses = 'flex justify-center max-w-full';
        if (isStart) alignClasses = 'flex justify-start max-w-full';
        if (isEnd) alignClasses = 'flex justify-end max-w-full';
        // On mobile screens, turn floats into centered responsive blocks so narrow text columns don't break
        if (isFloatRight) alignClasses = 'sm:float-right sm:ml-4 sm:mb-3 sm:mr-0 max-sm:w-full max-sm:flex max-sm:justify-center max-sm:my-2 max-w-full';
        if (isFloatLeft) alignClasses = 'sm:float-left sm:mr-4 sm:mb-3 sm:ml-0 max-sm:w-full max-sm:flex max-sm:justify-center max-sm:my-2 max-w-full';

        if (shp.visible === false && !isEditable) {
          return null;
        }

        const isCurrentlyResizing = liveResize?.index === index;
        const isCurrentlyRotating = liveRotation?.index === index;
        const isCurrentlyDragging = liveDrag?.index === index;

        let rawWidth = isCurrentlyResizing ? liveResize.width : (shp.width || 220);
        let rawHeight = isCurrentlyResizing ? liveResize.height : (shp.height || 110);

        // In compact mode (e.g. NoteCard preview), scale down nicely to fit card bounds
        const displayWidth = compact ? Math.min(rawWidth, 140) : rawWidth;
        const displayHeight = compact ? Math.min(rawHeight, 65) : rawHeight;
        const displayRotation = isCurrentlyRotating ? liveRotation.deg : (shp.rotation || 0);
        const currentPosX = isCurrentlyDragging ? liveDrag.x : (shp.posX || 0);
        const currentPosY = isCurrentlyDragging ? liveDrag.y : (shp.posY || 0);
        const isSelected = selectedShapeIndex === index;

        // Determine zIndex based on layer position (kept safely below header toolbar & popups)
        let baseZIndex = index + 1;
        if (isBehind) baseZIndex = -1;
        if (isInFront) baseZIndex = 10;
        if (isSelected) baseZIndex = 20;

        return (
          <div
            key={shp.id || `shape-${index}`}
            ref={(el) => {
              if (el) shapeDomRefs.current.set(index, el);
              else shapeDomRefs.current.delete(index);
            }}
            className={`shape-item-container relative group/shape transition-transform duration-75 max-w-full ${alignClasses} ${
              shp.visible === false ? 'opacity-40 grayscale-50' : ''
            }`}
            style={{
              zIndex: baseZIndex,
              transform: currentPosX || currentPosY
                ? `translate3d(${currentPosX}px, ${currentPosY}px, 0)`
                : undefined,
              willChange: isCurrentlyDragging ? 'transform' : 'auto',
            }}
          >
            <div
              onMouseDown={(e) => startDrag(e, index)}
              onTouchStart={(e) => startDrag(e, index)}
              className={`relative inline-flex items-center justify-center rounded-2xl max-w-full overflow-visible touch-manipulation select-none ${
                isEditable
                  ? 'cursor-grab active:cursor-grabbing p-1 ring-1 transition-all'
                  : ''
              } ${
                isSelected
                  ? 'ring-2 ring-[#4A6D22] bg-[#4A6D22]/5 shadow-sm'
                  : 'ring-transparent hover:ring-[#4A6D22]/40 hover:bg-[#4A6D22]/5'
              }`}
              onClick={(e) => {
                if (isEditable) {
                  e.stopPropagation();
                  setSelectedShapeIndex(index);
                  if (shp.id) {
                    window.dispatchEvent(new CustomEvent('active-shape-change', { detail: { shapeId: shp.id } }));
                  }
                }
              }}
              onDoubleClick={(e) => {
                if (isEditable) {
                  e.stopPropagation();
                  setCustomizerInitialTab('text');
                  setEditingShapeIndex(index);
                }
              }}
            >
              {/* Shape Vector SVG */}
              <ShapeSvg
                shape={{
                  ...shp,
                  width: displayWidth,
                  height: displayHeight,
                  rotation: displayRotation,
                }}
              />

              {/* Live Coordinates Tooltip during free drag positioning */}
              {isCurrentlyDragging && (
                <div
                  className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#1A1C16] text-[#D0E8B2] text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl shadow-2xl z-50 pointer-events-none whitespace-nowrap flex items-center gap-1.5 border border-[#4A6D22]/60"
                  dir="ltr"
                >
                  <Move className="w-3.5 h-3.5 text-[#D0E8B2] animate-pulse" />
                  <span>X: {currentPosX >= 0 ? `+${currentPosX}` : currentPosX}px</span>
                  <span className="text-white/40">|</span>
                  <span>Y: {currentPosY >= 0 ? `+${currentPosY}` : currentPosY}px</span>
                </div>
              )}

              {/* Live Dimensions Tooltip during resizing */}
              {isCurrentlyResizing && (
                <div
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#1A1C16] text-[#D0E8B2] text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg shadow-lg z-30 pointer-events-none whitespace-nowrap"
                  dir="ltr"
                >
                  {displayWidth} × {displayHeight} px
                </div>
              )}

              {/* Live Rotation Angle Tooltip during active anchor rotation */}
              {isCurrentlyRotating && (
                <div
                  className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#1A1C16] text-[#D0E8B2] text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg shadow-lg z-40 pointer-events-none whitespace-nowrap flex items-center gap-1"
                  dir="ltr"
                >
                  <RotateCw className="w-3 h-3 animate-spin text-[#D0E8B2]" />
                  <span>{displayRotation}°</span>
                </div>
              )}

              {/* 1. Interactive Canvas Resizers, Rotation & Center Move Handle */}
              {isEditable && (
                <div
                  className={`absolute inset-0 pointer-events-none transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-0 sm:group-hover/shape:opacity-100'
                  }`}
                >
                  {/* Bounding box outline */}
                  <div className="absolute inset-0 border border-dashed border-[#4A6D22]/60 rounded-xl pointer-events-none" />

                  {/* Top Stem Line for Rotation Anchor Handle */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[1.5px] h-6 bg-[#4A6D22] pointer-events-none" />

                  {/* Circular Rotation Anchor Handle */}
                  <div
                    onMouseDown={(e) => startRotate(e, index)}
                    onTouchStart={(e) => startRotate(e, index)}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 w-9 h-9 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto touch-none group/rot z-30"
                    title="چرخش آزاد شکل (بکشید یا با لمس بچرخانید)"
                  >
                    <div className="w-5 h-5 rounded-full bg-white dark:bg-[#1A1C16] border-2 border-[#4A6D22] shadow-md flex items-center justify-center text-[#4A6D22] group-hover/rot:scale-125 group-hover/rot:bg-[#D0E8B2] transition-all">
                      <RotateCw className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Corner NW (Top-Left) */}
                  <div
                    onMouseDown={(e) => startResize(e, index, 'nw')}
                    onTouchStart={(e) => startResize(e, index, 'nw')}
                    className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center cursor-nwse-resize pointer-events-auto touch-none group/handle z-20"
                    title="تغییر ابعاد (بالا-چپ)"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1A1C16] border-2 border-[#4A6D22] shadow-sm group-hover/handle:scale-125 transition-transform" />
                  </div>

                  {/* Corner NE (Top-Right) */}
                  <div
                    onMouseDown={(e) => startResize(e, index, 'ne')}
                    onTouchStart={(e) => startResize(e, index, 'ne')}
                    className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center cursor-nesw-resize pointer-events-auto touch-none group/handle z-20"
                    title="تغییر ابعاد (بالا-راست)"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1A1C16] border-2 border-[#4A6D22] shadow-sm group-hover/handle:scale-125 transition-transform" />
                  </div>

                  {/* Corner SW (Bottom-Left) */}
                  <div
                    onMouseDown={(e) => startResize(e, index, 'sw')}
                    onTouchStart={(e) => startResize(e, index, 'sw')}
                    className="absolute -bottom-3 -left-3 w-8 h-8 flex items-center justify-center cursor-nesw-resize pointer-events-auto touch-none group/handle z-20"
                    title="تغییر ابعاد (پایین-چپ)"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1A1C16] border-2 border-[#4A6D22] shadow-sm group-hover/handle:scale-125 transition-transform" />
                  </div>

                  {/* Corner SE (Bottom-Right) */}
                  <div
                    onMouseDown={(e) => startResize(e, index, 'se')}
                    onTouchStart={(e) => startResize(e, index, 'se')}
                    className="absolute -bottom-3 -right-3 w-8 h-8 flex items-center justify-center cursor-nwse-resize pointer-events-auto touch-none group/handle z-20"
                    title="تغییر ابعاد (پایین-راست)"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1A1C16] border-2 border-[#4A6D22] shadow-sm group-hover/handle:scale-125 transition-transform" />
                  </div>

                  {/* Edge E (Right Center) */}
                  <div
                    onMouseDown={(e) => startResize(e, index, 'e')}
                    onTouchStart={(e) => startResize(e, index, 'e')}
                    className="absolute top-1/2 -right-3 -translate-y-1/2 w-8 h-8 flex items-center justify-center cursor-ew-resize pointer-events-auto touch-none group/handle z-20"
                    title="تغییر طول شکل (افقی)"
                  >
                    <div className="w-3 h-4.5 rounded-xs bg-white dark:bg-[#1A1C16] border-2 border-[#4A6D22] shadow-sm group-hover/handle:scale-125 transition-transform" />
                  </div>

                  {/* Edge S (Bottom Center) */}
                  <div
                    onMouseDown={(e) => startResize(e, index, 's')}
                    onTouchStart={(e) => startResize(e, index, 's')}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center cursor-ns-resize pointer-events-auto touch-none group/handle z-20"
                    title="تغییر ارتفاع شکل (عمودی)"
                  >
                    <div className="w-4.5 h-3 rounded-xs bg-white dark:bg-[#1A1C16] border-2 border-[#4A6D22] shadow-sm group-hover/handle:scale-125 transition-transform" />
                  </div>
                </div>
              )}

              {/* Edit Mode Floating Toolbar */}
              {isEditable && (
                <div
                  className={`shape-floating-toolbar absolute -top-5 sm:-top-4 left-1/2 -translate-x-1/2 transition-all bg-[#1A1C16] dark:bg-[#282A22] text-white px-2 py-1.5 sm:py-1 rounded-2xl shadow-xl flex items-center gap-1 sm:gap-1.5 z-30 max-w-[calc(100vw-2rem)] overflow-x-auto touch-manipulation ${
                    isSelected ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none sm:group-hover/shape:opacity-100 sm:group-hover/shape:scale-100 sm:group-hover/shape:pointer-events-auto'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Settings Modal Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomizerInitialTab('shape');
                      setEditingShapeIndex(index);
                    }}
                    className="p-1.5 sm:p-1 hover:bg-white/20 active:bg-white/30 rounded-xl text-white text-[11px] sm:text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0"
                    title="ویرایش ابعاد، الگوها، گرادیان، سایه سه‌بعدی، لایه‌ها و متن شکل"
                  >
                    <Settings2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#D0E8B2]" />
                    <span className="inline">تنظیمات</span>
                  </button>

                  {/* Direct Text Editor Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomizerInitialTab('text');
                      setEditingShapeIndex(index);
                    }}
                    className="p-1.5 sm:p-1 hover:bg-white/20 active:bg-white/30 rounded-xl text-white text-[11px] sm:text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0"
                    title="نوشتن یا تغییر متن داخل کادر متنی / شکل"
                  >
                    <Type className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#D0E8B2]" />
                    <span className="inline">{shp.kind === 'textbox' ? 'متن کادر' : 'متن'}</span>
                  </button>

                  <div className="w-[1px] h-3.5 bg-white/20 shrink-0" />

                  {/* Word-like Layer Placement (Behind / Inline / In-Front) */}
                  <div className="flex items-center gap-0.5 shrink-0 bg-white/10 p-0.5 rounded-xl" title="موقعیت لایه نسبت به متن و اجزای بلوک">
                    {/* Behind Elements */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveShape({ ...shp, layerPosition: 'behind' }, index);
                      }}
                      className={`p-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        shp.layerPosition === 'behind'
                          ? 'bg-[#4A6D22] text-white shadow-xs'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title="قرار دادن شکل در پشت متن و اجزا (Behind Elements)"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5 text-[#D0E8B2]" />
                      <span className="hidden sm:inline">پشت متن</span>
                    </button>

                    {/* Inline Flow */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveShape({ ...shp, layerPosition: 'inline' }, index);
                      }}
                      className={`p-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        !shp.layerPosition || shp.layerPosition === 'inline'
                          ? 'bg-[#4A6D22] text-white shadow-xs'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title="قرار دادن شکل در امتداد متن (Inline Flow)"
                    >
                      <AlignCenter className="w-3.5 h-3.5 text-[#D0E8B2]" />
                      <span className="hidden sm:inline">هم‌تراز</span>
                    </button>

                    {/* In Front of Elements */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveShape({ ...shp, layerPosition: 'in-front' }, index);
                      }}
                      className={`p-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        shp.layerPosition === 'in-front'
                          ? 'bg-[#4A6D22] text-white shadow-xs'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title="قرار دادن شکل در روی متن و اجزا (In Front of Elements)"
                    >
                      <ArrowUpFromLine className="w-3.5 h-3.5 text-[#D0E8B2]" />
                      <span className="hidden sm:inline">روی متن</span>
                    </button>
                  </div>

                  {/* Reset Position (0, 0) button if shape has been moved */}
                  {(shp.posX || shp.posY) ? (
                    <>
                      <div className="w-[1px] h-3.5 bg-white/20 shrink-0" />
                      <button
                        type="button"
                        onClick={(e) => handleResetPosition(index, e)}
                        className="p-1.5 sm:p-1 hover:bg-white/20 active:bg-white/30 rounded-xl text-[#D0E8B2] hover:text-white flex items-center gap-1 text-[10px] font-bold transition-colors shrink-0"
                        title="بازنشانی مکان به نقطه مبدأ (۰, ۰)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">مرکز</span>
                      </button>
                    </>
                  ) : null}

                  <div className="w-[1px] h-3.5 bg-white/20 shrink-0" />

                  {/* Quick 45° Rotation Button */}
                  <button
                    type="button"
                    onClick={(e) => handleQuickRotate(index, e)}
                    className="p-1.5 sm:p-1 hover:bg-white/20 active:bg-white/30 rounded-xl text-[#D0E8B2] hover:text-white flex items-center gap-0.5 text-[11px] sm:text-[10px] font-bold transition-colors shrink-0"
                    title="چرخش سریع ۴۵ درجه‌ای شکل"
                  >
                    <RotateCw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="text-[10px] sm:text-[9px] tabular-nums font-mono" dir="ltr">
                      {shp.rotation ? `${shp.rotation}°` : '+45°'}
                    </span>
                  </button>

                  {/* Layer Stacking & Z-Index Controls (Shown when multiple shapes exist) */}
                  {shapes.length > 1 && (
                    <>
                      <div className="w-[1px] h-3.5 bg-white/20 shrink-0" />
                      
                      <div className="flex items-center gap-0.5 shrink-0" title="مدیریت لایه‌ها (ترتیب قرارگیری اشکال)">
                        {/* Bring to Front (Top) */}
                        <button
                          type="button"
                          disabled={index === shapes.length - 1}
                          onClick={(e) => handleBringToFront(index, e)}
                          className="p-1.5 sm:p-1 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl text-[#D0E8B2] hover:text-white transition-colors"
                          title="انتقال به روترین لایه شکل‌ها"
                        >
                          <ChevronsUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>

                        {/* Move Up One Layer */}
                        <button
                          type="button"
                          disabled={index === shapes.length - 1}
                          onClick={(e) => handleMoveForward(index, e)}
                          className="p-1.5 sm:p-1 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl text-white/80 hover:text-white transition-colors"
                          title="یک لایه به بالا"
                        >
                          <ChevronUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>

                        {/* Move Down One Layer */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => handleMoveBackward(index, e)}
                          className="p-1.5 sm:p-1 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl text-white/80 hover:text-white transition-colors"
                          title="یک لایه به پایین"
                        >
                          <ChevronDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>

                        {/* Send to Back (Bottom) */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => handleSendToBack(index, e)}
                          className="p-1.5 sm:p-1 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl text-[#D0E8B2] hover:text-white transition-colors"
                          title="انتقال به زیرترین لایه شکل‌ها"
                        >
                          <ChevronsDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </>
                  )}

                  <div className="w-[1px] h-3.5 bg-white/20 shrink-0" />

                  <button
                    type="button"
                    onClick={() => handleDuplicateShape(index)}
                    className="p-1.5 sm:p-1 hover:bg-white/20 active:bg-white/30 rounded-xl text-white/80 hover:text-white transition-colors shrink-0"
                    title="تکرار / کپی شکل"
                  >
                    <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteShape(index)}
                    className="p-1.5 sm:p-1 hover:bg-red-500/40 active:bg-red-500/60 rounded-xl text-red-300 hover:text-red-100 transition-colors shrink-0"
                    title="حذف شکل"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Editing Modal */}
            {isEditable && editingShapeIndex === index && (
              <ShapeCustomizerModal
                isOpen={true}
                shape={shp}
                initialTab={customizerInitialTab}
                onSave={(updated) => handleSaveShape(updated, index)}
                onClose={() => setEditingShapeIndex(null)}
                onDelete={() => handleDeleteShape(index)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

