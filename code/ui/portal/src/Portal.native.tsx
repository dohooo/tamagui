import { YStack } from '@tamagui/stacks'
import * as React from 'react'
import { RootTagContext } from 'react-native'
import { IS_FABRIC, USE_NATIVE_PORTAL } from './constants'
import type { PortalProps } from './PortalProps'
import { useStackedZIndex } from './useStackedZIndex'
import { GorhomPortalItem } from './GorhomPortalItem'

const createPortal = (() => {
  if (IS_FABRIC) {
    return require('react-native/Libraries/Renderer/shims/ReactFabric').createPortal
  }
  return require('react-native/Libraries/Renderer/shims/ReactNative').createPortal
})()

export const Portal = (propsIn: PortalProps) => {
  const { stackZIndex, ...props } = propsIn

  const rootTag = React.useContext(RootTagContext)
  const zIndex = useStackedZIndex(propsIn)

  const contents = (
    <YStack
      pointerEvents="box-none"
      fullscreen
      position="absolute"
      maxWidth="100%"
      {...props}
      zIndex={zIndex}
    />
  )

  if (!USE_NATIVE_PORTAL || !rootTag) {
    return <GorhomPortalItem hostName="root">{contents}</GorhomPortalItem>
  }

  return createPortal(contents, rootTag)
}
