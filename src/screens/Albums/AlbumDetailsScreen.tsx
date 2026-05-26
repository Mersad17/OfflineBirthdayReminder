import React from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../../components/Screen";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import {
  addPhotosToAlbum,
  deleteAlbumPhoto,
  deleteContactAlbum,
  fetchAlbumDetails,
} from "../../albums/repository";
import { pickAndCopyAlbumPhotos } from "../../albums/photoStorage";
import { ContactAlbumDetails, ContactAlbumPhoto } from "../../albums/types";

type Props = NativeStackScreenProps<
  ContactsStackParamList,
  "ContactAlbumDetails"
>;

const BG = "#F7EFE7";
const CARD = "#FFF9F1";
const TEXT = "#2B211B";
const MUTED = "#7B6F66";
const BORDER = "#EEDDD0";
const RED = "#EE6A5E";
const ORANGE = "#EBA55B";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const CONTENT_PADDING = 14;
const GRID_GAP = 8;
const PHOTO_SIZE =
  (SCREEN_WIDTH - CONTENT_PADDING * 2 - GRID_GAP * 2) / 3;

const ANDROID_STATUS_TOP =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

export default function AlbumDetailsScreen({ route, navigation }: Props) {
  const { contactId, albumId, albumTitle } = route.params;

  const [album, setAlbum] = React.useState<ContactAlbumDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState<
    number | null
  >(null);

  React.useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  React.useEffect(() => {
    load();
  }, [albumId]);

  const title = album?.title || albumTitle || "Photo album";
  const photos = album?.photos ?? [];

  const selectedPhoto =
    selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  React.useEffect(() => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex >= photos.length) {
      setSelectedPhotoIndex(null);
    }
  }, [photos.length, selectedPhotoIndex]);

  async function load() {
    try {
      setLoading(true);

      const data = await fetchAlbumDetails(albumId);

      setAlbum(data);
    } catch (error) {
      console.log("Load album failed:", error);
      Alert.alert("Album", "Could not load this album.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  async function addPhotos() {
    if (adding) return;

    try {
      setAdding(true);

      const pickedPhotos = await pickAndCopyAlbumPhotos({
        contactId: String(contactId),
        albumId: String(albumId),
      });

      if (pickedPhotos.length === 0) return;

      const updated = await addPhotosToAlbum({
        contactId,
        albumId,
        photos: pickedPhotos,
      });

      setAlbum(updated);
    } catch (error: any) {
      console.log("Add album photos failed:", error);
      Alert.alert("Photos", error?.message || "Could not add photos.");
    } finally {
      setAdding(false);
    }
  }

  async function confirmDeletePhoto(
    photo: ContactAlbumPhoto,
    options?: {
      closeViewer?: boolean;
    }
  ) {
    Alert.alert("Delete photo?", "This photo will be removed from the album.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAlbumPhoto(photo.id);

            if (options?.closeViewer) {
              setSelectedPhotoIndex(null);
            }

            await load();
          } catch (error) {
            console.log("Delete photo failed:", error);
            Alert.alert("Photo", "Could not delete photo.");
          }
        },
      },
    ]);
  }

  async function confirmDeleteAlbum() {
    Alert.alert(
      "Delete album?",
      "This album and its photos will be removed from this contact.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteContactAlbum(albumId);
              navigation.goBack();
            } catch (error) {
              console.log("Delete album failed:", error);
              Alert.alert("Album", "Could not delete album.");
            }
          },
        },
      ]
    );
  }

  function openPhoto(index: number) {
    setSelectedPhotoIndex(index);
  }

  function closePhoto() {
    setSelectedPhotoIndex(null);
  }

  if (loading && !album) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={RED} />
          <Text style={styles.loadingText}>Loading album…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.root}>
        <FlatList
          data={photos}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          columnWrapperStyle={
            photos.length > 0 ? styles.photoRow : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={RED}
            />
          }
          ListHeaderComponent={
            <AlbumHeader
              title={title}
              photoCount={photos.length}
              adding={adding}
              onBack={() => navigation.goBack()}
              onDelete={confirmDeleteAlbum}
              onAddPhotos={addPhotos}
            />
          }
          ListEmptyComponent={
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={addPhotos}
              activeOpacity={0.88}
            >
              <View style={styles.emptyIcon}>
                <Ionicons name="images-outline" size={28} color={ORANGE} />
              </View>

              <Text style={styles.emptyTitle}>No photos yet</Text>

              <Text style={styles.emptyText}>
                Add a few photos to make this album feel alive.
              </Text>
            </TouchableOpacity>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.photoTile}
              activeOpacity={0.9}
              onPress={() => openPhoto(index)}
              onLongPress={() => confirmDeletePhoto(item)}
            >
              <Image source={{ uri: item.uri }} style={styles.photo} />

              <TouchableOpacity
                style={styles.photoDelete}
                onPress={() => confirmDeletePhoto(item)}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />

        <PhotoViewerModal
          visible={selectedPhotoIndex !== null}
          title={title}
          photos={photos}
          currentIndex={selectedPhotoIndex ?? 0}
          onIndexChange={setSelectedPhotoIndex}
          onClose={closePhoto}
          onDelete={() => {
            if (selectedPhoto) {
              confirmDeletePhoto(selectedPhoto, {
                closeViewer: true,
              });
            }
          }}
        />
      </View>
    </Screen>
  );
}

function AlbumHeader({
  title,
  photoCount,
  adding,
  onBack,
  onDelete,
  onAddPhotos,
}: {
  title: string;
  photoCount: number;
  adding: boolean;
  onBack: () => void;
  onDelete: () => void;
  onAddPhotos: () => void;
}) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />

      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleButton}
          onPress={onDelete}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.headerBody}>
        <View style={styles.albumIconCircle}>
          <Ionicons name="images-outline" size={22} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.eyebrow}>PHOTO ALBUM</Text>

          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.metaPill}>
            <Ionicons name="image-outline" size={13} color="#FFFFFF" />
            <Text style={styles.metaPillText}>
              {photoCount} {photoCount === 1 ? "photo" : "photos"} saved
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.addButton, adding && styles.disabledButton]}
        onPress={onAddPhotos}
        disabled={adding}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />

        <Text style={styles.addButtonText}>
          {adding ? "Adding…" : "Add photos"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function PhotoViewerModal({
  visible,
  title,
  photos,
  currentIndex,
  onIndexChange,
  onClose,
  onDelete,
}: {
  visible: boolean;
  title: string;
  photos: ContactAlbumPhoto[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const listRef = React.useRef<FlatList<ContactAlbumPhoto> | null>(null);
  const pageWidth = SCREEN_WIDTH;

  React.useEffect(() => {
    if (!visible) return;

    const safeIndex = Math.max(0, Math.min(currentIndex, photos.length - 1));

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: safeIndex,
        animated: false,
      });
    });
  }, [visible]);

  function handleMomentumEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / pageWidth
    );

    const safeIndex = Math.max(0, Math.min(nextIndex, photos.length - 1));

    onIndexChange(safeIndex);
  }

  const currentPhoto = photos[currentIndex] ?? null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.viewerRoot}>
        <View style={styles.viewerTopBar}>
          <TouchableOpacity
            style={styles.viewerCircleButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={23} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.viewerTitleWrap}>
            <Text style={styles.viewerTitle} numberOfLines={1}>
              {title}
            </Text>

            <Text style={styles.viewerCounter}>
              {photos.length > 0
                ? `${currentIndex + 1} / ${photos.length}`
                : "0 / 0"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewerCircleButton}
            onPress={onDelete}
            activeOpacity={0.85}
            disabled={!currentPhoto}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.viewerImageWrap}>
          {photos.length > 0 ? (
            <FlatList
              ref={listRef}
              data={photos}
              keyExtractor={(item) => String(item.id)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={currentIndex}
              getItemLayout={(_, index) => ({
                length: pageWidth,
                offset: pageWidth * index,
                index,
              })}
              onMomentumScrollEnd={handleMomentumEnd}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  listRef.current?.scrollToOffset({
                    offset: pageWidth * info.index,
                    animated: false,
                  });
                }, 50);
              }}
              renderItem={({ item }) => (
                <View style={[styles.viewerImagePage, { width: pageWidth }]}>
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.viewerImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            />
          ) : (
            <Text style={styles.viewerEmptyText}>Photo not available.</Text>
          )}
        </View>

        {photos.length > 1 ? (
          <Text style={styles.viewerSwipeHint}>Swipe to see next photo</Text>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  center: {
    flex: 1,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 10,
  },

  content: {
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: ANDROID_STATUS_TOP + 12,
    paddingBottom: 42,
  },

  headerCard: {
    borderRadius: 32,
    padding: 16,
    backgroundColor: "#2B211B",
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  headerGlowOne: {
    position: "absolute",
    top: -55,
    right: -45,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(238,106,94,0.20)",
  },

  headerGlowTwo: {
    position: "absolute",
    bottom: -70,
    left: -55,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(235,165,91,0.14)",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  headerBody: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  albumIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(238,106,94,0.30)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    marginTop: 4,
  },

  metaPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  metaPillText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "800",
  },

  addButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: RED,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: RED,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  disabledButton: {
    opacity: 0.6,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  photoRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  photoTile: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  photoDelete: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    borderRadius: 28,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: "center",
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 24,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },

  emptyText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
    fontWeight: "600",
  },

  viewerRoot: {
    flex: 1,
    backgroundColor: "rgba(8, 7, 6, 0.97)",
    paddingTop: ANDROID_STATUS_TOP + 14,
    paddingBottom: 28,
  },

  viewerTopBar: {
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  viewerCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },

  viewerTitleWrap: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },

  viewerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  viewerCounter: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },

  viewerImageWrap: {
    flex: 1,
    marginTop: 10,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  viewerImagePage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.76,
  },

  viewerEmptyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  viewerSwipeHint: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
});