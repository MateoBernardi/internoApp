
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useCreateReporte } from '../viewmodels/useReportes';

const colors = Colors['light'];

export default function CrearReporte() {
	const router = useRouter();
	const { mutate: crearReporte, isPending } = useCreateReporte();

	// Form state
	const [usuarioId, setUsuarioId] = useState('');
	const [titulo, setTitulo] = useState('');
	const [descripcion, setDescripcion] = useState('');
	const [categoria, setCategoria] = useState<'NEGATIVO' | 'POSITIVO'>('NEGATIVO');
	const [fechaIncidente, setFechaIncidente] = useState<Date>(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);

	// Validación simple
	const isFormValid = useMemo(() => {
		return (
			usuarioId.trim().length > 0 &&
			titulo.trim().length > 0 &&
			descripcion.trim().length > 0 &&
			!!categoria &&
			fechaIncidente instanceof Date
		);
	}, [usuarioId, titulo, descripcion, categoria, fechaIncidente]);

	const handleCrearReporte = useCallback(() => {
		if (!isFormValid) {
			Alert.alert('Formulario incompleto', 'Por favor completa todos los campos');
			return;
		}
		crearReporte(
			{
				usuario_reportado_id: Number(usuarioId),
				titulo: titulo.trim(),
				descripcion: descripcion.trim(),
				categoria,
				fecha_incidente: fechaIncidente.toISOString().split('T')[0],
			},
			{
				onSuccess: () => {
					Alert.alert('Éxito', 'Reporte creado correctamente');
					router.back();
				},
				onError: (error: any) => {
					Alert.alert('Error', error?.message || 'No se pudo crear el reporte');
				},
			}
		);
	}, [isFormValid, crearReporte, usuarioId, titulo, descripcion, categoria, fechaIncidente, router]);

	return (
		<View style={styles.container}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.container}
			>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
						<Ionicons name="close" size={24} color={colors.icon} />
					</TouchableOpacity>
					<ThemedText style={styles.headerTitle}>Nuevo Reporte</ThemedText>
					<View style={{ width: 40 }} />
				</View>

				<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
					{/* Usuario reportado */}
					<View style={styles.inputSection}>
						<TextInput
							style={styles.input}
							placeholder="ID usuario reportado"
							placeholderTextColor={colors.secondaryText}
							value={usuarioId}
							onChangeText={setUsuarioId}
							keyboardType="numeric"
						/>
					</View>
					{/* Título */}
					<View style={styles.inputSection}>
						<TextInput
							style={styles.input}
							placeholder="Título"
							placeholderTextColor={colors.secondaryText}
							value={titulo}
							onChangeText={setTitulo}
							maxLength={100}
						/>
					</View>
					{/* Descripción */}
					<TextInput
						style={styles.messageInput}
						placeholder="Descripción"
						placeholderTextColor={colors.secondaryText}
						value={descripcion}
						onChangeText={setDescripcion}
						multiline
						textAlignVertical="top"
					/>
					{/* Categoría */}
					<View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10, alignItems: 'center' }]}> 
						<TouchableOpacity
							style={[styles.chip, categoria === 'NEGATIVO' && { borderColor: colors.error, backgroundColor: 'transparent', borderWidth: 1 }]}
							onPress={() => setCategoria('NEGATIVO')}
						>
							<ThemedText style={[styles.chipText, categoria === 'NEGATIVO' ? { color: colors.error, fontWeight: 'bold' } : { color: colors.secondaryText }]}>Negativo</ThemedText>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.chip, categoria === 'POSITIVO' && { borderColor: colors.success, backgroundColor: 'transparent', borderWidth: 1 }]}
							onPress={() => setCategoria('POSITIVO')}
						>
							<ThemedText style={[styles.chipText, categoria === 'POSITIVO' ? { color: colors.success, fontWeight: 'bold' } : { color: colors.secondaryText }]}>Positivo</ThemedText>
						</TouchableOpacity>
					</View>
					{/* Fecha incidente */}
					<View style={styles.inputSection}>
						<TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ flex: 1 }}>
							<ThemedText style={[styles.dateValue, { color: colors.text }]}>
								{fechaIncidente.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
							</ThemedText>
						</TouchableOpacity>
					</View>
				</ScrollView>

				{/* Floating Send Button */}
				<TouchableOpacity
					style={[
						styles.fab,
						{ backgroundColor: !isFormValid || isPending ? colors.secondaryText : colors.lightTint },
					]}
					onPress={handleCrearReporte}
					disabled={!isFormValid || isPending}
				>
					{isPending ? (
						<ActivityIndicator size="small" color={colors.componentBackground} />
					) : (
						<Ionicons name="send" size={24} color={colors.componentBackground} />
					)}
				</TouchableOpacity>

				{/* Date Picker */}
				{showDatePicker && (
					<DateTimePicker
						testID="dateTimePicker"
						value={fechaIncidente}
						mode="date"
						is24Hour={true}
						display={Platform.OS === 'ios' ? 'spinner' : 'default'}
						onChange={(event, selectedDate) => {
							setShowDatePicker(false);
							if (selectedDate && event.type !== 'dismissed') {
								setFechaIncidente(selectedDate);
							}
						}}
					/>
				)}
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.componentBackground,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginTop: Platform.OS === 'android' ? 0 : 0,
	},
	headerTitle: {
		fontSize: 20,
		color: colors.text,
		fontWeight: '500',
	},
	iconButton: {
		padding: 8,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		paddingBottom: 80,
	},
	inputSection: {
		flexDirection: 'row',
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.background,
	},
	input: {
		flex: 1,
		fontSize: 16,
		color: colors.text,
		padding: 0,
	},
	chip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.background,
		marginRight: 8,
	},
	chipText: {
		fontSize: 14,
	},
	dateValue: {
		fontSize: 16,
		color: colors.lightTint,
	},
	messageInput: {
		flex: 1,
		fontSize: 16,
		color: colors.text,
		padding: 16,
		minHeight: 120,
	},
	fab: {
		position: 'absolute',
		bottom: 80,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
	},
});
