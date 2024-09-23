import { View, StyleSheet, Text, TouchableOpacity, Modal, Button, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { db, auth } from './firebaseConnection';
import { deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns'; // Para formatar a data

export function UsersList({ data, handleEdit, handleDelete }) {
  const user = auth.currentUser;
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [hours, setHours] = useState(0);
  const [calculatedCost, setCalculatedCost] = useState(null);
  const [expirationTime, setExpirationTime] = useState(data.expirationTime || 0);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(''); // Estado para o método de pagamento

  useEffect(() => {
    const docRef = doc(db, "users", data.id);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      const userData = doc.data();
      if (userData && userData.expirationTime) {
        setExpirationTime(userData.expirationTime);
        if (userData.receipt) {
          setReceiptData(userData.receipt);
        }
      }
    });

    return () => unsubscribe();
  }, [data.id]);

  useEffect(() => {
    const checkExpiration = () => {
      const currentTime = new Date().getTime();
      if (expirationTime > currentTime) {
        setTimeout(checkExpiration, 1000);
      } else {
        setExpirationTime(0);
      }
    };

    checkExpiration();

    return () => clearTimeout();
  }, [expirationTime]);

  const calculateCost = (carroceria, eletrico, hours) => {
    const firstHourCosts = {
      "Sub Compacto": 2,
      "Compacto": 3,
      "Hatch": 5,
      "SUV": 5,
      "Sedan": 5,
      "Pickup": 7,
    };

    const firstHourCost = firstHourCosts[carroceria] || 0;
    const discountedFirstHourCost = eletrico === "Sim" ? firstHourCost / 2 : firstHourCost;
    const additionalHourCost = 2;

    const totalCost = hours > 1
      ? discountedFirstHourCost + (hours - 1) * additionalHourCost
      : discountedFirstHourCost;

    return totalCost;
  };

  const handleCalculateCost = () => {
    if (hours <= 0) {
      alert("Por favor, insira um número de horas válido.");
      return;
    }
    const cost = calculateCost(data.carroceria, data.eletrico, hours);
    setCalculatedCost(cost);
  };

  const handlePurchase = () => {
    if (hours <= 0) {
      alert("Por favor, insira um número de horas válido.");
      return;
    }
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!paymentMethod) {
      alert("Por favor, selecione um método de pagamento.");
      return;
    }

    const currentTime = new Date().getTime();
    const tempoEmMilissegundos = hours * 60 * 60 * 1000;
    const novoTempoExpiracao = currentTime + tempoEmMilissegundos;

    // Dados do comprovante
    const receipt = {
      modelo: data.modelo,
      marca: data.marca,
      placa: data.placa,
      carroceria: data.carroceria,
      eletrico: data.eletrico,
      custo: calculatedCost.toFixed(2),
      horaCompra: format(new Date(currentTime), 'dd/MM/yyyy HH:mm:ss'),
      horaSaida: format(new Date(novoTempoExpiracao), 'dd/MM/yyyy HH:mm:ss'),
      metodoPagamento: paymentMethod, // Inclui o método de pagamento
      uid: data.id,
    };

    await updateDoc(doc(db, "users", data.id), {
      expirationTime: novoTempoExpiracao,
      receipt: receipt
    });

    setExpirationTime(novoTempoExpiracao);
    setReceiptData(receipt);
    setPaymentModalVisible(false);
    setModalVisible(false);
  };

  const handleDeleteItem = async () => {
    const docRef = doc(db, "users", data.id);
    await deleteDoc(docRef);
  };

  const handleEditUser = () => {
    handleEdit(data);
  };

  const handleViewReceipt = () => {
    setReceiptModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.placa}>
        <View style={styles.placaCima}>
          <Image source={require('../assets/mercosul-Photoroom.png')} style={styles.bandeira} />
          <Text style={{ color: '#fff', fontWeight: '600', }}>BRASIL</Text>
          <Image source={require('../assets/br.png')} style={styles.bandeira} />
        </View>
        <Text style={{ color: '#000', fontWeight: '600', fontSize: 18, }}>{data.placa}</Text>
      </View>

      {expirationTime > new Date().getTime() && (
        <Text style={{paddingTop: 10, color: 'green',}}>
          Tempo Restante: {formatarTempo(expirationTime - new Date().getTime())}
        </Text>
      )}
      <View style={styles.boxBotaoPlaca}>
        <TouchableOpacity
          style={[styles.buttonFrontDell, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
          onPress={expirationTime <= new Date().getTime() ? handleDeleteItem : null}
          disabled={expirationTime > new Date().getTime()}
        >
          <Text style={styles.buttonText}>Deletar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonFrontEdit, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
          onPress={expirationTime <= new Date().getTime() ? handleEditUser : null}
          disabled={expirationTime > new Date().getTime()}
        >
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>
      </View>


      <TouchableOpacity
        style={[styles.buttonUsePlaca, { opacity: expirationTime > new Date().getTime() ? 0.5 : 1 }]}
        onPress={expirationTime <= new Date().getTime() ? () => setModalVisible(true) : null}
        disabled={expirationTime > new Date().getTime()}
      >
        <Text style={styles.buttonText}>Alugar Vaga</Text>
      </TouchableOpacity>

      {expirationTime > new Date().getTime() && (
        <TouchableOpacity
          style={styles.buttonComprovante}
          onPress={handleViewReceipt}
        >
          <Text style={styles.buttonText}>Comprovante</Text>
        </TouchableOpacity>
      )}

      {/* Modal para calcular e comprar */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          setCalculatedCost(null);
          setHours(0);
        }}
      >
        <View style={styles.modalHoras}>
          <View style={{ justifyContent: 'flex-start', width: '90%', }}>
            <Text style={{ marginLeft: 8, fontSize: 28, color: "#f28705", fontWeight: '600', }}>
              Calcular Horário
            </Text>
            <Text style={{ marginLeft: 8, marginTop: 8, marginBottom: 20, fontSize: 15, color: "gray" }}>
              De quantas horas precisa?
            </Text>
          </View>
          {/* Controle de horas com botões + e - */}
          <View style={styles.hourControl}>
            <TouchableOpacity style={styles.hourButton} onPress={() => setHours(prev => Math.max(prev - 1, 0))}>
              <Text style={styles.buttonTextHour}>-</Text>
            </TouchableOpacity>

            <Text style={styles.hourDisplay}>{hours}</Text>

            <TouchableOpacity style={styles.hourButton} onPress={() => setHours(prev => prev + 1)}>
              <Text style={styles.buttonTextHour}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.buttonConfirmar} onPress={handleCalculateCost}>
            <Text style={styles.buttonTextCalcular}>Calcular Custo</Text>
          </TouchableOpacity>

          {calculatedCost !== null && (
            <>
              <View style={styles.boxResult}>
                <Text style={styles.resultTotal}>Custo total: R$ {calculatedCost.toFixed(2)}</Text>
              </View>
              <TouchableOpacity style={styles.buttonComprar} onPress={handlePurchase} >
                <Text style={styles.buttonTextCalcular}>Comprar</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.buttonFechar} onPress={() => {
            setModalVisible(!modalVisible);
            setCalculatedCost(null);
            setHours(0);
          }}>
            <Text style={styles.buttonTextCalcular}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal para pagamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(!paymentModalVisible)}
      >
        <View style={styles.modalView}>
          <View style={{ justifyContent: 'flex-start', width: '90%', }}>
            <Text style={{ marginLeft: 8, fontSize: 28, color: "#f28705", fontWeight: '600', }}>
              Revisão
            </Text>
            <Text style={{ marginLeft: 8, marginTop: 2, marginBottom: 20, fontSize: 15, color: "gray" }}>
              Confirme o Pagamento
            </Text>
          </View>
          <Text style={styles.modalPalavra}>Modelo: {data.modelo}</Text>
          <Text style={styles.modalPalavra}>Marca: {data.marca}</Text>
          <Text style={styles.modalPalavra}>Placa: {data.placa}</Text>
          <Text style={styles.modalPalavra}>Carroceria: {data.carroceria}</Text>
          <Text style={styles.modalPalavra}>Elétrico: {data.eletrico}</Text>
          <Text style={styles.modalPalavra}>Total: R$ {calculatedCost?.toFixed(2)}</Text>

          {/* Botões para selecionar o método de pagamento */}
          <View style={styles.paymentOptions}>
            <View style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', }}>
              <TouchableOpacity
                style={[styles.paymentButton, paymentMethod === 'Cartão de crédito' && styles.selectedPayment]}
                onPress={() => setPaymentMethod('Cartão de crédito')}
              >
                <Image source={require('../assets/cartao.png')} style={styles.bandeira} />
                <Text style={styles.paymentButtonText}>Crédito</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentButton, paymentMethod === 'Cartão de débito' && styles.selectedPayment]}
                onPress={() => setPaymentMethod('Cartão de débito')}
              >
                <Image source={require('../assets/cartao.png')} style={styles.bandeira} />
                <Text style={styles.paymentButtonText}>Débito</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentButton, paymentMethod === 'Pix' && styles.selectedPayment]}
                onPress={() => setPaymentMethod('Pix')}
              >
                <Image source={require('../assets/pix.png')} style={styles.bandeira} />
                <Text style={styles.paymentButtonText}>Pix</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.buttonPagamento, styles.confirmButtonPagamento, !paymentMethod && styles.disabledButtonPagamento]}
            onPress={handleConfirmPayment}
            disabled={!paymentMethod}
          >
            <Text style={styles.buttonTextPagamento}>Confirmar Pagamento</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonFecharRevisao}  onPress={() => setPaymentModalVisible(false)}>
            <Text style={styles.buttonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal para comprovante */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(!receiptModalVisible)}
      >
        <View style={styles.modalView}>
          <View style={{ justifyContent: 'flex-start', width: '90%', }}>
            <Text style={{ marginLeft: 8, fontSize: 28, color: "#f28705", fontWeight: '600', }}>
              Comprovante
            </Text>
            <Text style={{ marginLeft: 8, marginTop: 2, marginBottom: 20, fontSize: 15, color: "gray" }}>
              Volte sempre!
            </Text>
          </View>
          {receiptData ? (
            <>
              <Text style={styles.comprovText}>Modelo: {receiptData.modelo}</Text>
              <Text style={styles.comprovText}>Marca: {receiptData.marca}</Text>
              <Text style={styles.comprovText}>Placa: {receiptData.placa}</Text>
              <Text style={styles.comprovText}>Carroceria: {receiptData.carroceria}</Text>
              <Text style={styles.comprovText}>Elétrico: {receiptData.eletrico}</Text>
              <Text style={styles.comprovText}>Custo: R$ {receiptData.custo}</Text>
              <Text style={styles.comprovText}>Hora da Compra: {receiptData.horaCompra}</Text>
              <Text style={styles.comprovText}>Hora de Saída: {receiptData.horaSaida}</Text>
              <Text style={styles.comprovText}>Método de Pagamento: {receiptData.metodoPagamento}</Text>
              <View style={{ marginTop: 14, alignItems: 'center', width: '100%', }}>

                <Image source={require('../assets/barras.png')} style={{ maxWidth: 300, height: 40, }} />
                <Text style={{fontSize: 15}}> {receiptData.uid}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.comprovText}>Nenhum comprovante disponível.</Text>
          )}
          <TouchableOpacity style={styles.buttonFecharCompr}  onPress={() => setReceiptModalVisible(false)}>
            <Text style={styles.buttonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const formatarTempo = (tempoRestante) => {
  const totalSegundos = Math.floor(tempoRestante / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 14,
    width: 300,
  },
  btnCarro: {
    width: 70,
    height: 70,
    borderRadius: '50%',
    fontSize: 19,
    fontWeight: '600',
    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,

    // Sombra para Android
    elevation: 5,
  },
  item: {
    color: "#000",
    fontSize: 16,
  },
  buttonFront: {
    backgroundColor: "#f28705",
    alignSelf: "center",
    paddingTop: 10,
    paddingLeft: 20,
    paddingBottom: 10,
    paddingRight: 20,
    borderRadius: 8,
    marginTop: 25,

    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,

    // Sombra para Android
    elevation: 5,
  },
  buttonUsePlaca: {
    backgroundColor: "#f28705",
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    width: '90%',
    
    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,

    // Sombra para Android
    elevation: 5,
  },
  buttonComprovante: {
    backgroundColor: "#f28705",
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 10,
    width: '90%',

    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,

    // Sombra para Android
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    paddingLeft: 8,
    paddingRight: 8,
    textAlign: 'center',
  },
  buttonTextCalcular: {
    color: "#fff",
    paddingLeft: 8,
    paddingRight: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonEdit: {
    backgroundColor: "#000",
    alignSelf: "flex-start",
    padding: 4,
    borderRadius: 8,
    marginTop: 16,

    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,

    // Sombra para Android
    elevation: 5,
  },
  buttonUse: {
    backgroundColor: "#007BFF",
    alignSelf: "flex-start",
    padding: 4,
    borderRadius: 8,
    marginTop: 16,

    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,

    // Sombra para Android
    elevation: 5,
  },
  modalView: {
    flex: 1,
    alignItems: 'flex-start',
    margin: 20,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 35,
    alignItems: "baseline",
  },
  modalHoras: {
    flex: 1,
    paddingTop: '30%',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 35,
    alignItems: "center",
    width: '100%',
    height: '100%',
  },
  comprovText: {
    marginTop: 7,
  },
  comprovTitulo: {
    fontSize: 20,
    color: '#261419',
    marginBottom: 20,
  },
  fecharComprov: {
    width: '90%',
    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,

    // Sombra para Android
    elevation: 5,
  },
  modalText: {
    marginBottom: 20,
    marginTop: 15,
    textAlign: "center",
    fontSize: 23,
    fontWeight: '600',
    color: '#f28705',
  },
  modalPalavra: {
    marginBottom: 5,
    fontSize: 16,
    color: '#000',
  },
  modalTextHoras: {
    marginBottom: 15,
    marginTop: 15,
    textAlign: "center",
    fontSize: 20,
    color: '#f28705',
  },
  hourControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    width: '60%',
    marginVertical: 16,
  },
  hourButton: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    width: '10',
    height: '50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextHour: {
    fontSize: 30,
    color: '#000',
    paddingBottom: 5,
  },
  hourDisplay: {
    marginHorizontal: 20,
    fontSize: 26,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 10,
    paddingTop: 7,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  result: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultTotal: {
    padding: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentOptions: {
    marginTop: 20,
    width: '100%',
  },
  paymentButton: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  paymentButtonText: {
    fontSize: 16,
  },
  selectedPayment: {
    backgroundColor: '#f26705',
    color: '#fff',
  },
  placa: {
    width: '90%',
    height: 60,
    alignItems: 'center',
    borderColor: '#000',
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  placaCima: {
    backgroundColor: '#0037a8',
    width: '100%',
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    color: 'white',
    display: 'flex',
    flexDirection: 'row',
    height: 25,
  },
  bandeira: {
    width: 30,
    height: 20,
    borderRadius: 2,
  },
  barras: {
    width: 300,
    borderRadius: 2,
  },
  boxBotaoPlaca: {
    display: 'flex',
    flexDirection: 'row',
    width: '90%',
    justifyContent: 'space-between',
  },
  buttonFrontDell: {
    backgroundColor: "#c20e0e",
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginTop: 25,
    width: '45%',
    height: 40,
  },
  buttonFrontEdit: {
    backgroundColor: "#8c8c8c",
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginTop: 25,
    width: '45%',
    height: 40,
  },
  buttonConfirmar: {
    backgroundColor: "#f28705",
    marginHorizontal: 8,
    borderRadius: 4,
    padding: 10,
    paddingVertical: 10,
    width: '60%',
    marginTop: 20,
  },
  buttonFechar: {
    backgroundColor: "#f28705",
    marginHorizontal: 8,
    borderRadius: 4,
    padding: 10,
    paddingVertical: 10,
    width: '60%',
    marginTop: 60,
  },
  buttonFecharCompr: {
    backgroundColor: "#f28705",
    borderRadius: 4,
    padding: 10,
    paddingVertical: 10,
    width: '100%',
    marginTop: 20,
  },
  buttonFecharRevisao: {
    backgroundColor: "#f28705",
    borderRadius: 4,
    padding: 10,
    paddingVertical: 10,
    width: '100%',
  },
  buttonComprar: {
    backgroundColor: "#229a00",
    marginHorizontal: 8,
    borderRadius: 4,
    padding: 10,
    paddingVertical: 10,
    width: '60%',
    marginTop: 20,
  },
  boxResult: {
    backgroundColor: "#fff",
    marginHorizontal: 8,
    borderRadius: 4,
    width: '60%',
    marginTop: 20,
    justifyContent: 'center',
    textAlign: 'center',
    alignItems: 'center',
  },
  buttonPagamento: {
    width: '100%',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  confirmButtonPagamento: {
    backgroundColor: '#4CAF50', // Verde
  },
  closeButtonPagamento: {
    backgroundColor: '#f44336', // Vermelho
  },
  disabledButtonPagamento: {
    backgroundColor: '#c1c1c1', // Cinza
  },
  buttonTextPagamento: {
    color: '#fff',
    fontSize: 16,
  },
});