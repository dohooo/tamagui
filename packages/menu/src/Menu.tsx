import { AnimatePresence as Presence } from '@tamagui/animate-presence'
import { createCollection } from '@tamagui/collection'
import {
  Slot,
  Text,
  composeEventHandlers,
  composeRefs,
  createStyledContext,
  useComposedRefs,
} from '@tamagui/core'
import { Dismissable as DismissableLayer } from '@tamagui/dismissable'
import { dispatchDiscreteCustomEvent } from '@tamagui/dismissable'
import { useFocusGuards } from '@tamagui/focus-guard'
import { FocusScope } from '@tamagui/focus-scope'
import * as PopperPrimitive from '@tamagui/popper'
import type { PopperContentProps } from '@tamagui/popper'
import { Portal as PortalPrimitive, PortalProps } from '@tamagui/portal'
import { RovingFocusGroup } from '@tamagui/roving-focus'
import type { RovingFocusGroupProps } from '@tamagui/roving-focus'
import { SizableStackProps, ThemeableStack, YStack } from '@tamagui/stacks'
import { useCallbackRef } from '@tamagui/use-callback-ref'
import { useDirection } from '@tamagui/use-direction'
import { Stack, Theme, isWeb, styled } from '@tamagui/web'
import { TamaguiElement } from '@tamagui/web/types'
import { hideOthers } from 'aria-hidden'
import { useId } from 'react'
import * as React from 'react'
import { RemoveScroll } from 'react-remove-scroll'

type Direction = 'ltr' | 'rtl'

const SELECTION_KEYS = ['Enter', ' ']
const FIRST_KEYS = ['ArrowDown', 'PageUp', 'Home']
const LAST_KEYS = ['ArrowUp', 'PageDown', 'End']
const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS]
const SUB_OPEN_KEYS: Record<Direction, string[]> = {
  ltr: [...SELECTION_KEYS, 'ArrowRight'],
  rtl: [...SELECTION_KEYS, 'ArrowLeft'],
}
const SUB_CLOSE_KEYS: Record<Direction, string[]> = {
  ltr: ['ArrowLeft'],
  rtl: ['ArrowRight'],
}

/* -------------------------------------------------------------------------------------------------
 * Menu
 * -----------------------------------------------------------------------------------------------*/

const MENU_NAME = 'Menu'

type ItemData = { disabled: boolean; textValue: string }
const [Collection, useCollection] = createCollection<MenuItemElement, ItemData>(MENU_NAME)

type ScopedProps<P> = P & { __scopeMenu?: string }

type MenuContextValue = {
  open: boolean
  onOpenChange(open: boolean): void
  content: MenuContentElement | null
  onContentChange(content: MenuContentElement | null): void
}

const { Provider: MenuProvider, useStyledContext: useMenuContext } =
  createStyledContext<MenuContextValue>()

type MenuRootContextValue = {
  onClose(): void
  isUsingKeyboardRef: React.RefObject<boolean>
  dir: Direction
  modal: boolean
}

const { Provider: MenuRootProvider, useStyledContext: useMenuRootContext } =
  createStyledContext<MenuRootContextValue>()

interface MenuProps extends PopperPrimitive.PopperProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?(open: boolean): void
  dir?: Direction
  modal?: boolean
}

const MENU_CONTEXT = 'MenuContext'

const Menu: React.FC<ScopedProps<MenuProps>> = (props: ScopedProps<MenuProps>) => {
  const {
    __scopeMenu,
    open = false,
    children,
    dir,
    onOpenChange,
    modal = true,
    ...rest
  } = props
  const [content, setContent] = React.useState<MenuContentElement | null>(null)
  const isUsingKeyboardRef = React.useRef(false)
  const handleOpenChange = useCallbackRef(onOpenChange)
  const direction = useDirection(dir)

  if (isWeb) {
    React.useEffect(() => {
      // Capture phase ensures we set the boolean before any side effects execute
      // in response to the key or pointer event as they might depend on this value.

      const handleKeyDown = () => {
        isUsingKeyboardRef.current = true
        document.addEventListener('pointerdown', handlePointer, {
          capture: true,
          once: true,
        })
        document.addEventListener('pointermove', handlePointer, {
          capture: true,
          once: true,
        })
      }
      const handlePointer = () => (isUsingKeyboardRef.current = false)
      document.addEventListener('keydown', handleKeyDown, { capture: true })
      return () => {
        document.removeEventListener('keydown', handleKeyDown, { capture: true })
        document.removeEventListener('pointerdown', handlePointer, { capture: true })
        document.removeEventListener('pointermove', handlePointer, { capture: true })
      }
    }, [])
  }

  return (
    <PopperPrimitive.Popper __scopePopper={__scopeMenu || MENU_CONTEXT} {...rest}>
      <MenuProvider
        scope={__scopeMenu}
        open={open}
        onOpenChange={handleOpenChange}
        content={content}
        onContentChange={setContent}
      >
        <MenuRootProvider
          scope={__scopeMenu}
          onClose={React.useCallback(() => handleOpenChange(false), [handleOpenChange])}
          isUsingKeyboardRef={isUsingKeyboardRef}
          dir={direction}
          modal={modal}
        >
          {children}
        </MenuRootProvider>
      </MenuProvider>
    </PopperPrimitive.Popper>
  )
}

Menu.displayName = MENU_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuAnchor
 * -----------------------------------------------------------------------------------------------*/

const ANCHOR_NAME = 'MenuAnchor'

// type MenuAnchorElement = React.ElementRef<typeof PopperPrimitive.PopperAnchor>
type PopperAnchorProps = React.ComponentPropsWithoutRef<
  typeof PopperPrimitive.PopperAnchor
>
interface MenuAnchorProps extends PopperAnchorProps {}

const MenuAnchor = (props: MenuAnchorProps) => {
  return <PopperPrimitive.PopperAnchor __scopePopper={MENU_CONTEXT} {...props} />
}

MenuAnchor.displayName = ANCHOR_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuPortal
 * -----------------------------------------------------------------------------------------------*/

const PORTAL_NAME = 'MenuPortal'

type PortalContextValue = { forceMount?: true }

const { Provider: PortalProvider, useStyledContext: usePortalContext } =
  createStyledContext<PortalContextValue>()

interface MenuPortalProps {
  children?: React.ReactNode
  /**
   * Specify a container element to portal the content into.
   */
  host?: PortalProps['host']
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true
}

const MenuPortal: React.FC<ScopedProps<MenuPortalProps>> = (
  props: ScopedProps<MenuPortalProps>
) => {
  const { __scopeMenu, forceMount, children, host } = props
  const context = useMenuContext(__scopeMenu)
  return (
    <PortalProvider scope={__scopeMenu} forceMount={forceMount}>
      <Presence>
        {forceMount || context.open ? (
          <PortalPrimitive asChild host={host}>
            {children}
          </PortalPrimitive>
        ) : null}
      </Presence>
    </PortalProvider>
  )
}

MenuPortal.displayName = PORTAL_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'MenuContent'

type MenuContentContextValue = {
  onItemEnter(event: React.PointerEvent): void
  onItemLeave(event: React.PointerEvent): void
  onTriggerLeave(event: React.PointerEvent): void
  searchRef: React.RefObject<string>
  pointerGraceTimerRef: React.MutableRefObject<number>
  onPointerGraceIntentChange(intent: GraceIntent | null): void
}

const { Provider: MenuContentProvider, useStyledContext: useMenuContentContext } =
  createStyledContext<MenuContentContextValue>()

type MenuContentElement = MenuRootContentTypeElement
/**
 * We purposefully don't union MenuRootContent and MenuSubContent props here because
 * they have conflicting prop types. We agreed that we would allow MenuSubContent to
 * accept props that it would just ignore.
 */
interface MenuContentProps extends MenuRootContentTypeProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true
}

const MenuContent = React.forwardRef<MenuContentElement, ScopedProps<MenuContentProps>>(
  (props: ScopedProps<MenuContentProps>, forwardedRef) => {
    const portalContext = usePortalContext(props.__scopeMenu)
    const { forceMount = portalContext.forceMount, ...contentProps } = props
    const context = useMenuContext(props.__scopeMenu)
    const rootContext = useMenuRootContext(props.__scopeMenu)

    return (
      <Collection.Provider __scopeCollection={props.__scopeMenu || MENU_CONTEXT}>
        <Presence>
          {forceMount || context.open ? (
            <Collection.Slot __scopeCollection={props.__scopeMenu || MENU_CONTEXT}>
              {rootContext.modal ? (
                <MenuRootContentModal {...contentProps} ref={forwardedRef} />
              ) : (
                <MenuRootContentNonModal {...contentProps} ref={forwardedRef} />
              )}
            </Collection.Slot>
          ) : null}
        </Presence>
      </Collection.Provider>
    )
  }
)

/* ---------------------------------------------------------------------------------------------- */

type MenuRootContentTypeElement = MenuContentImplElement
interface MenuRootContentTypeProps
  extends Omit<MenuContentImplProps, keyof MenuContentImplPrivateProps> {}

const MenuRootContentModal = React.forwardRef<
  MenuRootContentTypeElement,
  MenuRootContentTypeProps
>((props: ScopedProps<MenuRootContentTypeProps>, forwardedRef) => {
  const context = useMenuContext(props.__scopeMenu)
  const ref = React.useRef<MenuRootContentTypeElement>(null)
  const composedRefs = useComposedRefs(forwardedRef, ref)

  // Hide everything from ARIA except the `MenuContent`
  React.useEffect(() => {
    const content = ref.current
    if (content) return hideOthers(content as HTMLElement)
  }, [])

  return (
    <MenuContentImpl
      {...props}
      ref={composedRefs}
      // we make sure we're not trapping once it's been closed
      // (closed !== unmounted when animating out)
      trapFocus={context.open}
      // make sure to only disable pointer events when open
      // this avoids blocking interactions while animating out
      disableOutsidePointerEvents={context.open}
      disableOutsideScroll
      // When focus is trapped, a `focusout` event may still happen.
      // We make sure we don't trigger our `onDismiss` in such case.
      onFocusOutside={composeEventHandlers(
        props.onFocusOutside,
        (event: Event) => event.preventDefault(),
        { checkDefaultPrevented: false }
      )}
      onDismiss={() => context.onOpenChange(false)}
    />
  )
})

const MenuRootContentNonModal = React.forwardRef<
  MenuRootContentTypeElement,
  MenuRootContentTypeProps
>((props: ScopedProps<MenuRootContentTypeProps>, forwardedRef) => {
  const context = useMenuContext(props.__scopeMenu)
  return (
    <MenuContentImpl
      {...props}
      ref={forwardedRef}
      trapFocus={false}
      disableOutsidePointerEvents={false}
      disableOutsideScroll={false}
      onDismiss={() => context.onOpenChange(false)}
    />
  )
})

/* ---------------------------------------------------------------------------------------------- */

type MenuContentImplElement = React.ElementRef<typeof PopperPrimitive.PopperContent>
type FocusScopeProps = React.ComponentPropsWithoutRef<typeof FocusScope>
type DismissableLayerProps = React.ComponentPropsWithoutRef<typeof DismissableLayer>
type MenuContentImplPrivateProps = {
  onOpenAutoFocus?: FocusScopeProps['onMountAutoFocus']
  onDismiss?: DismissableLayerProps['onDismiss']
  disableOutsidePointerEvents?: DismissableLayerProps['disableOutsidePointerEvents']

  /**
   * Whether scrolling outside the `MenuContent` should be prevented
   * (default: `false`)
   */
  disableOutsideScroll?: boolean

  /**
   * Whether focus should be trapped within the `MenuContent`
   * (default: false)
   */
  trapFocus?: FocusScopeProps['trapped']
}
interface MenuContentImplProps
  extends MenuContentImplPrivateProps,
    Omit<PopperContentProps, 'dir' | 'onPlaced'> {
  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  onCloseAutoFocus?: FocusScopeProps['onUnmountAutoFocus']

  /**
   * Whether keyboard navigation should loop around
   * @defaultValue false
   */
  loop?: RovingFocusGroupProps['loop']

  onEntryFocus?: RovingFocusGroupProps['onEntryFocus']
  onEscapeKeyDown?: DismissableLayerProps['onEscapeKeyDown']
  onPointerDownOutside?: DismissableLayerProps['onPointerDownOutside']
  onFocusOutside?: DismissableLayerProps['onFocusOutside']
  onInteractOutside?: DismissableLayerProps['onInteractOutside']
}

type StyleableMenuContentProps = MenuContentImplProps & SizableStackProps

const MenuContentImpl = React.forwardRef<
  MenuContentImplElement,
  ScopedProps<StyleableMenuContentProps>
>((props, forwardedRef) => {
  const {
    __scopeMenu,
    loop = false,
    trapFocus,
    onOpenAutoFocus,
    onCloseAutoFocus,
    disableOutsidePointerEvents,
    onEntryFocus,
    onEscapeKeyDown,
    onPointerDownOutside,
    onFocusOutside,
    onInteractOutside,
    onDismiss,
    disableOutsideScroll,
    ...contentProps
  } = props

  const context = useMenuContext(__scopeMenu)
  const rootContext = useMenuRootContext(__scopeMenu)
  const getItems = useCollection(__scopeMenu)
  const [currentItemId, setCurrentItemId] = React.useState<string | null>(null)
  const contentRef = React.useRef<TamaguiElement>(null)
  const composedRefs = useComposedRefs(forwardedRef, contentRef, context.onContentChange)
  const timerRef = React.useRef<NodeJS.Timeout>(0 as unknown as NodeJS.Timeout)
  const searchRef = React.useRef('')
  const pointerGraceTimerRef = React.useRef(0)
  const pointerGraceIntentRef = React.useRef<GraceIntent | null>(null)
  const pointerDirRef = React.useRef<Side>('right')
  const lastPointerXRef = React.useRef(0)

  const ScrollLockWrapper = disableOutsideScroll ? RemoveScroll : React.Fragment
  const scrollLockWrapperProps = disableOutsideScroll
    ? { as: Slot, allowPinchZoom: true }
    : undefined

  const handleTypeaheadSearch = (key: string) => {
    const search = searchRef.current + key
    const items = getItems().filter((item) => !item.disabled)
    const currentItem = document.activeElement
    const currentMatch = items.find((item) => item.ref.current === currentItem)?.textValue
    const values = items.map((item) => item.textValue)
    const nextMatch = getNextMatch(values, search, currentMatch)
    const newItem = items.find((item) => item.textValue === nextMatch)?.ref.current

    // Reset `searchRef` 1 second after it was last updated
    ;(function updateSearch(value: string) {
      searchRef.current = value
      clearTimeout(timerRef.current)
      if (value !== '') timerRef.current = setTimeout(() => updateSearch(''), 1000)
    })(search)

    if (newItem) {
      /**
       * Imperative focus during keydown is risky so we prevent React's batching updates
       * to avoid potential bugs. See: https://github.com/facebook/react/issues/20332
       */
      setTimeout(() => (newItem as HTMLElement).focus())
    }
  }

  React.useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  // Make sure the whole tree has focus guards as our `MenuContent` may be
  // the last element in the DOM (beacuse of the `Portal`)
  useFocusGuards()

  const isPointerMovingToSubmenu = React.useCallback((event: React.PointerEvent) => {
    const isMovingTowards = pointerDirRef.current === pointerGraceIntentRef.current?.side
    return (
      isMovingTowards && isPointerInGraceArea(event, pointerGraceIntentRef.current?.area)
    )
  }, [])

  const content = (
    <PopperPrimitive.PopperContent
      role="menu"
      elevation={30}
      backgroundColor={'$background'}
      aria-orientation="vertical"
      data-state={getOpenState(context.open)}
      data-tamagui-menu-content=""
      // @ts-ignore
      dir={rootContext.dir}
      __scopePopper={__scopeMenu || MENU_CONTEXT}
      {...contentProps}
      ref={composedRefs}
      outlineWidth={0}
      // TODO: why type casting is necessary here?
      {...(contentProps.style as Object)}
      // @ts-ignore
      // style={{ outline: 'none', ...contentProps.style }}
      {...(isWeb
        ? {
            onKeyDown: composeEventHandlers(
              //@ts-ignore
              contentProps.onKeyDown,
              (event: KeyboardEvent) => {
                // submenu key events bubble through portals. We only care about keys in this menu.
                const target = event.target as HTMLElement
                const isKeyDownInside =
                  target.closest('[data-tamagui-menu-content]') === event.currentTarget
                const isModifierKey = event.ctrlKey || event.altKey || event.metaKey
                const isCharacterKey = event.key.length === 1
                if (isKeyDownInside) {
                  // menus should not be navigated using tab key so we prevent it
                  if (event.key === 'Tab') event.preventDefault()
                  if (!isModifierKey && isCharacterKey) handleTypeaheadSearch(event.key)
                }
                // focus first/last item based on key pressed
                const content = contentRef.current
                if (event.target !== content) return
                if (!FIRST_LAST_KEYS.includes(event.key)) return
                event.preventDefault()
                const items = getItems().filter((item) => !item.disabled)
                const candidateNodes = items.map((item) => item.ref.current!)
                if (LAST_KEYS.includes(event.key)) candidateNodes.reverse()
                focusFirst(candidateNodes as HTMLElement[])
              }
            ),
            // @ts-ignore
            onBlur: composeEventHandlers(props.onBlur, (event: MouseEvent) => {
              // clear search buffer when leaving the menu
              // @ts-ignore
              if (!event.currentTarget?.contains(event.target)) {
                clearTimeout(timerRef.current)
                searchRef.current = ''
              }
            }),
            onPointerMove: composeEventHandlers(
              // @ts-ignore
              props.onPointerMove,
              // @ts-ignore
              whenMouse((event: MouseEvent) => {
                const target = event.target as HTMLElement
                const pointerXHasChanged = lastPointerXRef.current !== event.clientX

                // We don't use `event.movementX` for this check because Safari will
                // always return `0` on a pointer event.
                // @ts-ignore
                if (event.currentTarget?.contains(target) && pointerXHasChanged) {
                  const newDir =
                    event.clientX > lastPointerXRef.current ? 'right' : 'left'
                  pointerDirRef.current = newDir
                  lastPointerXRef.current = event.clientX
                }
              })
            ),
          }
        : {})}
    />
  )

  return (
    <MenuContentProvider
      scope={__scopeMenu}
      searchRef={searchRef}
      onItemEnter={React.useCallback(
        (event) => {
          if (isPointerMovingToSubmenu(event)) event.preventDefault()
        },
        [isPointerMovingToSubmenu]
      )}
      onItemLeave={React.useCallback(
        (event) => {
          if (isPointerMovingToSubmenu(event)) return
          contentRef.current?.focus()
          setCurrentItemId(null)
        },
        [isPointerMovingToSubmenu]
      )}
      onTriggerLeave={React.useCallback(
        (event) => {
          if (isPointerMovingToSubmenu(event)) event.preventDefault()
        },
        [isPointerMovingToSubmenu]
      )}
      pointerGraceTimerRef={pointerGraceTimerRef}
      onPointerGraceIntentChange={React.useCallback((intent) => {
        pointerGraceIntentRef.current = intent
      }, [])}
    >
      {isWeb ? (
        <ScrollLockWrapper {...scrollLockWrapperProps}>
          <FocusScope
            trapped={trapFocus}
            onMountAutoFocus={composeEventHandlers(onOpenAutoFocus, (event) => {
              // when opening, explicitly focus the content area only and leave
              // `onEntryFocus` in  control of focusing first item
              event.preventDefault()
              contentRef.current?.focus()
            })}
            onUnmountAutoFocus={onCloseAutoFocus}
          >
            <DismissableLayer
              disableOutsidePointerEvents={disableOutsidePointerEvents}
              onEscapeKeyDown={onEscapeKeyDown}
              onPointerDownOutside={onPointerDownOutside}
              onFocusOutside={onFocusOutside}
              onInteractOutside={onInteractOutside}
              onDismiss={onDismiss}
            >
              <RovingFocusGroup
                asChild
                __scopeRovingFocusGroup={__scopeMenu || MENU_CONTEXT}
                dir={rootContext.dir}
                orientation="vertical"
                loop={loop}
                currentTabStopId={currentItemId}
                onCurrentTabStopIdChange={setCurrentItemId}
                onEntryFocus={composeEventHandlers(onEntryFocus, (event) => {
                  // only focus first item when using keyboard
                  if (!rootContext.isUsingKeyboardRef.current) event.preventDefault()
                })}
              >
                {content}
              </RovingFocusGroup>
            </DismissableLayer>
          </FocusScope>
        </ScrollLockWrapper>
      ) : (
        content
      )}
    </MenuContentProvider>
  )
})

MenuContent.displayName = CONTENT_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuGroup
 * -----------------------------------------------------------------------------------------------*/

const GROUP_NAME = 'MenuGroup'

// type MenuGroupElement = React.ElementRef<typeof Stack>
type PrimitiveDivProps = React.ComponentPropsWithoutRef<typeof Stack>
interface MenuGroupProps extends PrimitiveDivProps {}

const MenuGroup = styled(ThemeableStack, {
  name: GROUP_NAME,
  role: 'group',
})

MenuGroup.displayName = GROUP_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuLabel
 * -----------------------------------------------------------------------------------------------*/

const LABEL_NAME = 'MenuLabel'

// type MenuLabelElement = React.ElementRef<typeof Stack>
interface MenuLabelProps extends PrimitiveDivProps {}

const MenuLabel = styled(ThemeableStack, {
  name: LABEL_NAME,
})

MenuLabel.displayName = LABEL_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuItem
 * -----------------------------------------------------------------------------------------------*/

const ITEM_NAME = 'MenuItem'
const ITEM_SELECT = 'menu.itemSelect'

type MenuItemElement = MenuItemImplElement
interface MenuItemProps extends Omit<MenuItemImplProps, 'onSelect'> {
  onSelect?: (event: Event) => void
}

const MenuItem = ThemeableStack.styleable<ScopedProps<MenuItemProps>>(
  (props: ScopedProps<MenuItemProps>, forwardedRef) => {
    const { disabled = false, onSelect, children, ...itemProps } = props
    const ref = React.useRef<HTMLDivElement>(null)
    const rootContext = useMenuRootContext(props.__scopeMenu)
    const contentContext = useMenuContentContext(props.__scopeMenu)
    const composedRefs = useComposedRefs(forwardedRef, ref)
    const isPointerDownRef = React.useRef(false)

    const handleSelect = () => {
      // TODO: these things shouldn't work on native
      const menuItem = ref.current
      if (!disabled && menuItem) {
        const itemSelectEvent = new CustomEvent(ITEM_SELECT, {
          bubbles: true,
          cancelable: true,
        })
        menuItem.addEventListener(ITEM_SELECT, (event) => onSelect?.(event), {
          once: true,
        })
        dispatchDiscreteCustomEvent(menuItem, itemSelectEvent)
        if (itemSelectEvent.defaultPrevented) {
          isPointerDownRef.current = false
        } else {
          rootContext.onClose()
        }
      }
    }

    const content = typeof children === 'string' ? <Text>{children}</Text> : children

    return (
      <MenuItemImpl
        {...itemProps}
        // @ts-ignore
        ref={composeRefs}
        disabled={disabled}
        onPress={composeEventHandlers(props.onPress, handleSelect)}
        onPointerDown={(event) => {
          props.onPointerDown?.(event)
          isPointerDownRef.current = true
        }}
        onPointerUp={composeEventHandlers(props.onPointerUp, (event) => {
          // Pointer down can move to a different menu item which should activate it on pointer up.
          // We dispatch a click for selection to allow composition with click based triggers and to
          // prevent Firefox from getting stuck in text selection mode when the menu closes.
          if (isWeb) {
            // @ts-ignore
            if (!isPointerDownRef.current) event.currentTarget?.click()
          }
        })}
        children={content}
        {...(isWeb
          ? {
              // @ts-ignore
              onKeyDown: composeEventHandlers(props.onKeyDown, (event: KeyboardEvent) => {
                const isTypingAhead = contentContext.searchRef.current !== ''
                if (disabled || (isTypingAhead && event.key === ' ')) return
                if (SELECTION_KEYS.includes(event.key)) {
                  // @ts-ignore
                  event.currentTarget?.click()
                  /**
                   * We prevent default browser behaviour for selection keys as they should trigger
                   * a selection only:
                   * - prevents space from scrolling the page.
                   * - if keydown causes focus to move, prevents keydown from firing on the new target.
                   */
                  event.preventDefault()
                }
              }),
            }
          : {})}
      />
    )
  }
)

MenuItem.displayName = ITEM_NAME

/* ---------------------------------------------------------------------------------------------- */

type MenuItemImplElement = React.ElementRef<typeof Stack>
interface MenuItemImplProps extends PrimitiveDivProps {
  disabled?: boolean
  textValue?: string
}

const MenuItemImpl = React.forwardRef<
  MenuItemImplElement,
  ScopedProps<MenuItemImplProps>
>((props: ScopedProps<MenuItemImplProps>, forwardedRef) => {
  const { __scopeMenu, disabled = false, textValue, ...itemProps } = props
  const contentContext = useMenuContentContext(__scopeMenu)
  const ref = React.useRef<TamaguiElement>(null)
  const composedRefs = useComposedRefs(forwardedRef, ref)
  const [isFocused, setIsFocused] = React.useState(false)

  // get the item's `.textContent` as default strategy for typeahead `textValue`
  const [textContent, setTextContent] = React.useState('')
  if (isWeb) {
    React.useEffect(() => {
      const menuItem = ref.current
      if (menuItem) {
        // @ts-ignore
        setTextContent((menuItem.textContent ?? '').trim())
      }
    }, [itemProps.children])
  }

  return (
    <Collection.ItemSlot
      __scopeCollection={__scopeMenu || MENU_CONTEXT}
      disabled={disabled}
      textValue={textValue ?? textContent}
    >
      <RovingFocusGroup.Item
        asChild
        __scopeRovingFocusGroup={__scopeMenu || MENU_CONTEXT}
        focusable={!disabled}
      >
        <ThemeableStack
          componentName={ITEM_NAME}
          role="menuitem"
          data-highlighted={isFocused ? '' : undefined}
          aria-disabled={disabled || undefined}
          data-disabled={disabled ? '' : undefined}
          {...itemProps}
          ref={composedRefs}
          /**
           * We focus items on `pointerMove` to achieve the following:
           *
           * - Mouse over an item (it focuses)
           * - Leave mouse where it is and use keyboard to focus a different item
           * - Wiggle mouse without it leaving previously focused item
           * - Previously focused item should re-focus
           *
           * If we used `mouseOver`/`mouseEnter` it would not re-focus when the mouse
           * wiggles. This is to match native menu implementation.
           */
          onPointerMove={composeEventHandlers(
            props.onPointerMove,
            // @ts-ignore
            whenMouse((event) => {
              if (disabled) {
                // @ts-ignore
                contentContext.onItemLeave(event)
              } else {
                // @ts-ignore
                contentContext.onItemEnter(event)
                if (!event.defaultPrevented) {
                  const item = event.currentTarget
                  // @ts-ignore
                  item.focus()
                }
              }
            })
          )}
          onPointerLeave={composeEventHandlers(
            // @ts-ignore
            props.onPointerLeave,
            // @ts-ignore
            whenMouse((event) => contentContext.onItemLeave(event))
          )}
          {...(isWeb
            ? {
                onFocus: composeEventHandlers(props.onFocus, () => setIsFocused(true)),
                // @ts-ignore
                onBlur: composeEventHandlers(props.onBlur, () => setIsFocused(false)),
              }
            : null)}
        />
      </RovingFocusGroup.Item>
    </Collection.ItemSlot>
  )
})

/* -------------------------------------------------------------------------------------------------
 * MenuCheckboxItem
 * -----------------------------------------------------------------------------------------------*/

const CHECKBOX_ITEM_NAME = 'MenuCheckboxItem'

// type MenuCheckboxItemElement = MenuItemElement

type CheckedState = boolean | 'indeterminate'

interface MenuCheckboxItemProps extends MenuItemProps {
  checked?: CheckedState
  // `onCheckedChange` can never be called with `"indeterminate"` from the inside
  onCheckedChange?: (checked: boolean) => void
}

const MenuCheckboxItem = ThemeableStack.styleable<ScopedProps<MenuCheckboxItemProps>>(
  (props: ScopedProps<MenuCheckboxItemProps>, forwardedRef) => {
    const { checked = false, onCheckedChange, ...checkboxItemProps } = props
    return (
      <ItemIndicatorProvider scope={props.__scopeMenu} checked={checked}>
        {/* @ts-ignore */}
        <MenuItem
          componentName={CHECKBOX_ITEM_NAME}
          {...(isWeb
            ? {
                role: 'menuitemcheckbox',
              }
            : null)}
          aria-checked={isIndeterminate(checked) ? 'mixed' : checked}
          {...checkboxItemProps}
          ref={forwardedRef}
          data-state={getCheckedState(checked)}
          onSelect={composeEventHandlers(
            checkboxItemProps.onSelect,
            () => onCheckedChange?.(isIndeterminate(checked) ? true : !checked),
            { checkDefaultPrevented: false }
          )}
        />
      </ItemIndicatorProvider>
    )
  }
)

MenuCheckboxItem.displayName = CHECKBOX_ITEM_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuRadioGroup
 * -----------------------------------------------------------------------------------------------*/

const RADIO_GROUP_NAME = 'MenuRadioGroup'

const { Provider: RadioGroupProvider, useStyledContext: useRadioGroupContext } =
  createStyledContext<MenuRadioGroupProps>()

// type MenuRadioGroupElement = React.ElementRef<typeof MenuGroup>
interface MenuRadioGroupProps extends MenuGroupProps {
  value?: string
  onValueChange?: (value: string) => void
}

const MenuRadioGroup = MenuGroup.styleable<ScopedProps<MenuRadioGroupProps>>(
  (props: ScopedProps<MenuRadioGroupProps>, forwardedRef) => {
    const { value, onValueChange, ...groupProps } = props
    const handleValueChange = useCallbackRef(onValueChange)
    return (
      <RadioGroupProvider
        scope={props.__scopeMenu}
        value={value}
        onValueChange={handleValueChange}
      >
        <MenuRadioGroup
          componentName={RADIO_GROUP_NAME}
          {...groupProps}
          ref={forwardedRef}
        />
      </RadioGroupProvider>
    )
  }
)

MenuRadioGroup.displayName = RADIO_GROUP_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuRadioItem
 * -----------------------------------------------------------------------------------------------*/

const RADIO_ITEM_NAME = 'MenuRadioItem'

// type MenuRadioItemElement = React.ElementRef<typeof MenuItem>
interface MenuRadioItemProps extends MenuItemProps {
  value: string
}

const MenuRadioItem = ThemeableStack.styleable<ScopedProps<MenuRadioItemProps>>(
  (props: ScopedProps<MenuRadioItemProps>, forwardedRef) => {
    const { value, ...radioItemProps } = props
    const context = useRadioGroupContext(props.__scopeMenu)
    const checked = value === context.value
    return (
      <ItemIndicatorProvider scope={props.__scopeMenu} checked={checked}>
        {/* @ts-ignore */}
        <MenuItem
          componentName={RADIO_ITEM_NAME}
          {...(isWeb
            ? {
                'aria-checked': { checked },
              }
            : null)}
          {...radioItemProps}
          ref={forwardedRef}
          data-state={getCheckedState(checked)}
          onSelect={composeEventHandlers(
            radioItemProps.onSelect,
            () => context.onValueChange?.(value),
            { checkDefaultPrevented: false }
          )}
        />
      </ItemIndicatorProvider>
    )
  }
)

MenuRadioItem.displayName = RADIO_ITEM_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuItemIndicator
 * -----------------------------------------------------------------------------------------------*/

const ITEM_INDICATOR_NAME = 'MenuItemIndicator'

type CheckboxContextValue = { checked: CheckedState }

const { Provider: ItemIndicatorProvider, useStyledContext: useItemIndicatorContext } =
  createStyledContext<CheckboxContextValue>()

// type MenuItemIndicatorElement = React.ElementRef<typeof Stack>
type PrimitiveSpanProps = React.ComponentPropsWithoutRef<typeof Stack>
interface MenuItemIndicatorProps extends PrimitiveSpanProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true
}

const MenuItemIndicator = ThemeableStack.styleable<ScopedProps<MenuItemIndicatorProps>>(
  (props: ScopedProps<MenuItemIndicatorProps>, forwardedRef) => {
    const { __scopeMenu, forceMount, ...itemIndicatorProps } = props
    const indicatorContext = useItemIndicatorContext(__scopeMenu)
    return (
      <Presence>
        {forceMount ||
        isIndeterminate(indicatorContext.checked) ||
        indicatorContext.checked === true ? (
          <ThemeableStack
            componentName={ITEM_INDICATOR_NAME}
            tag="span"
            {...itemIndicatorProps}
            ref={forwardedRef}
            data-state={getCheckedState(indicatorContext.checked)}
          />
        ) : null}
      </Presence>
    )
  }
)

MenuItemIndicator.displayName = ITEM_INDICATOR_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuSeparator
 * -----------------------------------------------------------------------------------------------*/

const SEPARATOR_NAME = 'MenuSeparator'

// type MenuSeparatorElement = React.ElementRef<typeof Stack>
interface MenuSeparatorProps extends PrimitiveDivProps {}

const MenuSeparator = styled(ThemeableStack, {
  name: SEPARATOR_NAME,
  role: 'separator',
  // @ts-ignore
  'aria-orientation': 'horizontal',
})

MenuSeparator.displayName = SEPARATOR_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuArrow
 * -----------------------------------------------------------------------------------------------*/

const ARROW_NAME = 'MenuArrow'

// type MenuArrowElement = React.ElementRef<typeof PopperPrimitive.PopperArrow>
type PopperArrowProps = React.ComponentPropsWithoutRef<typeof PopperPrimitive.PopperArrow>
interface MenuArrowProps extends PopperArrowProps {}

const MenuArrow = React.forwardRef<TamaguiElement, ScopedProps<MenuArrowProps>>(
  function PopoverArrow(props: ScopedProps<MenuArrowProps>, forwardedRef) {
    const { __scopeMenu, ...rest } = props
    return (
      <PopperPrimitive.PopperArrow
        __scopePopper={__scopeMenu || MENU_CONTEXT}
        componentName="PopoverArrow"
        backgroundColor={'$background'}
        {...rest}
        ref={forwardedRef}
      />
    )
  }
)

MenuArrow.displayName = ARROW_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuSub
 * -----------------------------------------------------------------------------------------------*/

const SUB_NAME = 'MenuSub'

type MenuSubContextValue = {
  contentId: string
  triggerId: string
  trigger: MenuSubTriggerElement | null
  onTriggerChange(trigger: MenuSubTriggerElement | null): void
}

const { Provider: MenuSubProvider, useStyledContext: useMenuSubContext } =
  createStyledContext<MenuSubContextValue>()

interface MenuSubProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?(open: boolean): void
}

const MenuSub: React.FC<ScopedProps<MenuSubProps>> = (
  props: ScopedProps<MenuSubProps>
) => {
  const { __scopeMenu, children, open = false, onOpenChange } = props
  const parentMenuContext = useMenuContext(__scopeMenu)
  const [trigger, setTrigger] = React.useState<MenuSubTriggerElement | null>(null)
  const [content, setContent] = React.useState<MenuContentElement | null>(null)
  const handleOpenChange = useCallbackRef(onOpenChange)

  // Prevent the parent menu from reopening with open submenus.
  React.useEffect(() => {
    if (parentMenuContext.open === false) handleOpenChange(false)
    return () => handleOpenChange(false)
  }, [parentMenuContext.open, handleOpenChange])

  return (
    <PopperPrimitive.Popper __scopePopper={__scopeMenu || MENU_CONTEXT}>
      <MenuProvider
        scope={__scopeMenu}
        open={open}
        onOpenChange={handleOpenChange}
        content={content}
        onContentChange={setContent}
      >
        <MenuSubProvider
          scope={__scopeMenu}
          contentId={useId()}
          triggerId={useId()}
          trigger={trigger}
          onTriggerChange={setTrigger}
        >
          {children}
        </MenuSubProvider>
      </MenuProvider>
    </PopperPrimitive.Popper>
  )
}

MenuSub.displayName = SUB_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuSubTrigger
 * -----------------------------------------------------------------------------------------------*/

const SUB_TRIGGER_NAME = 'MenuSubTrigger'

type MenuSubTriggerElement = MenuItemImplElement
interface MenuSubTriggerProps extends MenuItemImplProps {}

const MenuSubTrigger = YStack.styleable<ScopedProps<MenuSubTriggerProps>>(
  (props: ScopedProps<MenuSubTriggerProps>, forwardedRef) => {
    const context = useMenuContext(props.__scopeMenu)
    const rootContext = useMenuRootContext(props.__scopeMenu)
    const subContext = useMenuSubContext(props.__scopeMenu)
    const contentContext = useMenuContentContext(props.__scopeMenu)
    const openTimerRef = React.useRef<number | null>(null)
    const { pointerGraceTimerRef, onPointerGraceIntentChange } = contentContext
    const scope = { __scopeMenu: props.__scopeMenu }

    const clearOpenTimer = React.useCallback(() => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }, [])

    React.useEffect(() => clearOpenTimer, [clearOpenTimer])

    React.useEffect(() => {
      const pointerGraceTimer = pointerGraceTimerRef.current
      return () => {
        window.clearTimeout(pointerGraceTimer)
        onPointerGraceIntentChange(null)
      }
    }, [pointerGraceTimerRef, onPointerGraceIntentChange])

    return (
      <MenuAnchor componentName={SUB_TRIGGER_NAME} asChild {...scope}>
        <MenuItemImpl
          id={subContext.triggerId}
          aria-haspopup="menu"
          aria-expanded={context.open}
          aria-controls={subContext.contentId}
          data-state={getOpenState(context.open)}
          {...props}
          ref={composeRefs(forwardedRef, subContext.onTriggerChange)}
          // This is redundant for mouse users but we cannot determine pointer type from
          // click event and we cannot use pointerup event (see git history for reasons why)
          onPress={(event) => {
            props.onPress?.(event)
            if (props.disabled || event.defaultPrevented) return
            /**
             * We manually focus because iOS Safari doesn't always focus on click (e.g. buttons)
             * and we rely heavily on `onFocusOutside` for submenus to close when switching
             * between separate submenus.
             */
            if (isWeb) {
              // @ts-ignore
              event.currentTarget.focus()
            }
            if (!context.open) context.onOpenChange(true)
          }}
          onPointerMove={composeEventHandlers(
            props.onPointerMove,
            // @ts-ignore
            whenMouse((event: PointerEvent<Element>) => {
              contentContext.onItemEnter(event)
              if (event.defaultPrevented) return
              if (!props.disabled && !context.open && !openTimerRef.current) {
                contentContext.onPointerGraceIntentChange(null)
                openTimerRef.current = window.setTimeout(() => {
                  context.onOpenChange(true)
                  clearOpenTimer()
                }, 100)
              }
            })
          )}
          onPointerLeave={composeEventHandlers(
            props.onPointerLeave,
            // @ts-ignore
            whenMouse((event: PointerEvent<Element>) => {
              clearOpenTimer()

              // @ts-ignore
              const contentRect = context.content?.getBoundingClientRect()
              if (contentRect) {
                // TODO: make sure to update this when we change positioning logic
                // @ts-ignore
                const side = context.content?.dataset.side as Side
                const rightSide = side === 'right'
                const bleed = rightSide ? -5 : +5
                const contentNearEdge = contentRect[rightSide ? 'left' : 'right']
                const contentFarEdge = contentRect[rightSide ? 'right' : 'left']

                contentContext.onPointerGraceIntentChange({
                  area: [
                    // Apply a bleed on clientX to ensure that our exit point is
                    // consistently within polygon bounds
                    { x: event.clientX + bleed, y: event.clientY },
                    { x: contentNearEdge, y: contentRect.top },
                    { x: contentFarEdge, y: contentRect.top },
                    { x: contentFarEdge, y: contentRect.bottom },
                    { x: contentNearEdge, y: contentRect.bottom },
                  ],
                  side,
                })

                window.clearTimeout(pointerGraceTimerRef.current)
                pointerGraceTimerRef.current = window.setTimeout(
                  () => contentContext.onPointerGraceIntentChange(null),
                  300
                )
              } else {
                contentContext.onTriggerLeave(event)
                if (event.defaultPrevented) return

                // There's 100ms where the user may leave an item before the submenu was opened.
                contentContext.onPointerGraceIntentChange(null)
              }
            })
          )}
          {...(isWeb
            ? {
                onKeyDown: composeEventHandlers(
                  // @ts-ignore
                  props.onKeyDown,
                  (event: KeyboardEvent) => {
                    const isTypingAhead = contentContext.searchRef.current !== ''
                    if (props.disabled || (isTypingAhead && event.key === ' ')) return
                    if (SUB_OPEN_KEYS[rootContext.dir].includes(event.key)) {
                      context.onOpenChange(true)
                      // The trigger may hold focus if opened via pointer interaction
                      // so we ensure content is given focus again when switching to keyboard.
                      context.content?.focus()
                      // prevent window from scrolling
                      event.preventDefault()
                    }
                  }
                ),
              }
            : null)}
        />
      </MenuAnchor>
    )
  }
)

MenuSubTrigger.displayName = SUB_TRIGGER_NAME

/* -------------------------------------------------------------------------------------------------
 * MenuSubContent
 * -----------------------------------------------------------------------------------------------*/

const SUB_CONTENT_NAME = 'MenuSubContent'

type MenuSubContentElement = MenuContentImplElement
interface MenuSubContentProps
  extends Omit<
    MenuContentImplProps,
    | keyof MenuContentImplPrivateProps
    | 'onCloseAutoFocus'
    | 'onEntryFocus'
    | 'side'
    | 'align'
  > {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true
}

const MenuSubContent = React.forwardRef<
  MenuSubContentElement,
  ScopedProps<MenuSubContentProps>
>((props: ScopedProps<MenuSubContentProps>, forwardedRef) => {
  const portalContext = usePortalContext(props.__scopeMenu)
  const { forceMount = portalContext.forceMount, ...subContentProps } = props
  const context = useMenuContext(props.__scopeMenu)
  const rootContext = useMenuRootContext(props.__scopeMenu)
  const subContext = useMenuSubContext(props.__scopeMenu)
  const ref = React.useRef<MenuSubContentElement>(null)
  const composedRefs = useComposedRefs(forwardedRef, ref)
  return (
    <Collection.Provider __scopeCollection={props.__scopeMenu || MENU_CONTEXT}>
      <Presence>
        {forceMount || context.open ? (
          <Collection.Slot __scopeCollection={props.__scopeMenu || MENU_CONTEXT}>
            <MenuContentImpl
              id={subContext.contentId}
              aria-labelledby={subContext.triggerId}
              {...subContentProps}
              ref={composedRefs}
              //@ts-ignore
              align="start"
              //@ts-ignore
              side={rootContext.dir === 'rtl' ? 'left' : 'right'}
              disableOutsidePointerEvents={false}
              disableOutsideScroll={false}
              trapFocus={false}
              onOpenAutoFocus={(event) => {
                // when opening a submenu, focus content for keyboard users only
                if (rootContext.isUsingKeyboardRef.current) ref.current?.focus()
                event.preventDefault()
              }}
              // The menu might close because of focusing another menu item in the parent menu. We
              // don't want it to refocus the trigger in that case so we handle trigger focus ourselves.
              onCloseAutoFocus={(event) => event.preventDefault()}
              onFocusOutside={composeEventHandlers(props.onFocusOutside, (event) => {
                // We prevent closing when the trigger is focused to avoid triggering a re-open animation
                // on pointer interaction.
                if (event.target !== subContext.trigger) context.onOpenChange(false)
              })}
              onEscapeKeyDown={composeEventHandlers(props.onEscapeKeyDown, (event) => {
                rootContext.onClose()
                // ensure pressing escape in submenu doesn't escape full screen mode
                event.preventDefault()
              })}
              {...(isWeb
                ? {
                    // @ts-ignore
                    onKeyDown: composeEventHandlers(
                      // @ts-ignore
                      props.onKeyDown,
                      (event: KeyboardEvent) => {
                        // Submenu key events bubble through portals. We only care about keys in this menu.
                        // @ts-ignore
                        const isKeyDownInside = event.currentTarget.contains(
                          event.target as HTMLElement
                        )
                        const isCloseKey = SUB_CLOSE_KEYS[rootContext.dir].includes(
                          event.key
                        )
                        if (isKeyDownInside && isCloseKey) {
                          context.onOpenChange(false)
                          // We focus manually because we prevented it in `onCloseAutoFocus`
                          subContext.trigger?.focus()
                          // prevent window from scrolling
                          event.preventDefault()
                        }
                      }
                    ),
                  }
                : null)}
            />
          </Collection.Slot>
        ) : null}
      </Presence>
    </Collection.Provider>
  )
})

MenuSubContent.displayName = SUB_CONTENT_NAME

/* -----------------------------------------------------------------------------------------------*/

function getOpenState(open: boolean) {
  return open ? 'open' : 'closed'
}

function isIndeterminate(checked?: CheckedState): checked is 'indeterminate' {
  return checked === 'indeterminate'
}

function getCheckedState(checked: CheckedState) {
  return isIndeterminate(checked) ? 'indeterminate' : checked ? 'checked' : 'unchecked'
}

function focusFirst(candidates: HTMLElement[]) {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement
  for (const candidate of candidates) {
    // if focus is already where we want to go, we don't want to keep going through the candidates
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return
    candidate.focus()
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return
  }
}

/**
 * Wraps an array around itself at a given start index
 * Example: `wrapArray(['a', 'b', 'c', 'd'], 2) === ['c', 'd', 'a', 'b']`
 */
function wrapArray<T>(array: T[], startIndex: number) {
  return array.map((_, index) => array[(startIndex + index) % array.length])
}

/**
 * This is the "meat" of the typeahead matching logic. It takes in all the values,
 * the search and the current match, and returns the next match (or `undefined`).
 *
 * We normalize the search because if a user has repeatedly pressed a character,
 * we want the exact same behavior as if we only had that one character
 * (ie. cycle through options starting with that character)
 *
 * We also reorder the values by wrapping the array around the current match.
 * This is so we always look forward from the current match, and picking the first
 * match will always be the correct one.
 *
 * Finally, if the normalized search is exactly one character, we exclude the
 * current match from the values because otherwise it would be the first to match always
 * and focus would never move. This is as opposed to the regular case, where we
 * don't want focus to move if the current match still matches.
 */
function getNextMatch(values: string[], search: string, currentMatch?: string) {
  const isRepeated =
    search.length > 1 && Array.from(search).every((char) => char === search[0])
  const normalizedSearch = isRepeated ? search[0] : search
  const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1
  let wrappedValues = wrapArray(values, Math.max(currentMatchIndex, 0))
  const excludeCurrentMatch = normalizedSearch.length === 1
  if (excludeCurrentMatch) wrappedValues = wrappedValues.filter((v) => v !== currentMatch)
  const nextMatch = wrappedValues.find((value) =>
    value.toLowerCase().startsWith(normalizedSearch.toLowerCase())
  )
  return nextMatch !== currentMatch ? nextMatch : undefined
}

type Point = { x: number; y: number }
type Polygon = Point[]
type Side = 'left' | 'right'
type GraceIntent = { area: Polygon; side: Side }

// Determine if a point is inside of a polygon.
// Based on https://github.com/substack/point-in-polygon
function isPointInPolygon(point: Point, polygon: Polygon) {
  const { x, y } = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    // prettier-ignore
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside
  }

  return inside
}

function isPointerInGraceArea(event: React.PointerEvent, area?: Polygon) {
  if (!area) return false
  const cursorPos = { x: event.clientX, y: event.clientY }
  return isPointInPolygon(cursorPos, area)
}

function whenMouse<E>(
  handler: React.PointerEventHandler<E>
): React.PointerEventHandler<E> {
  return (event) => (event.pointerType === 'mouse' ? handler(event) : undefined)
}

const Root = Menu
const Anchor = MenuAnchor
const Portal = MenuPortal
const Content = MenuContent
const Group = MenuGroup
const Label = MenuLabel
const Item = MenuItem
const CheckboxItem = MenuCheckboxItem
const RadioGroup = MenuRadioGroup
const RadioItem = MenuRadioItem
const ItemIndicator = MenuItemIndicator
const Separator = MenuSeparator
const Arrow = MenuArrow
const Sub = MenuSub
const SubTrigger = MenuSubTrigger
const SubContent = MenuSubContent

export {
  //
  Menu,
  MenuAnchor,
  MenuPortal,
  MenuContent,
  MenuGroup,
  MenuLabel,
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuItemIndicator,
  MenuSeparator,
  MenuArrow,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  //
  Root,
  Anchor,
  Portal,
  Content,
  Group,
  Label,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  ItemIndicator,
  Separator,
  Arrow,
  Sub,
  SubTrigger,
  SubContent,
}
export type {
  MenuProps,
  MenuAnchorProps,
  MenuPortalProps,
  MenuContentProps,
  MenuGroupProps,
  MenuLabelProps,
  MenuItemProps,
  MenuCheckboxItemProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuItemIndicatorProps,
  MenuSeparatorProps,
  MenuArrowProps,
  MenuSubProps,
  MenuSubTriggerProps,
  MenuSubContentProps,
}
