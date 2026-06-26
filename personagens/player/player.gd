extends CharacterBody2D

@export var bullet_scene: PackedScene 

var normal_speed = 300.0
var boost_speed = 150.0

var inimigos_no_cone = []

var current_speed = normal_speed
var can_dash = true

var municao = 1;

@onready var raycast = $origemTiro/RayCast2D
@onready var laser_line = $origemTiro/RayCast2D/Line2D

func _physics_process(delta):

	print("Inimigos no cone:", inimigos_no_cone.size())

	var direction = Input.get_vector(
		"move_left",
		"move_right",
		"move_up",
		"move_down"
	)

	velocity = direction * current_speed
	move_and_slide()

	for inimigo in inimigos_no_cone:

		if pode_ver(inimigo):

			print("ESTOU VENDO:", inimigo.name)

			inimigo.get_node("Sprite2D").visible = true
			inimigo.get_node("Polygon2D").visible = true

			if inimigo.has_node("PointLight2D"):
				inimigo.get_node("PointLight2D").visible = true

		else:

			inimigo.get_node("Sprite2D").visible = false
			inimigo.get_node("Polygon2D").visible = false

			if inimigo.has_node("PointLight2D"):
				inimigo.get_node("PointLight2D").visible = false

	look_at(get_global_mouse_position())

	if Input.is_action_just_pressed("shoot"):
		if municao > 0:
			shoot()

	if Input.is_action_just_pressed("rolar") and can_dash:
		dash()

	check_door_collision()
# 🔥 FUNÇÃO NOVA: detecta encostar na porta
func check_door_collision():
	for i in range(get_slide_collision_count()):
		var collision = get_slide_collision(i)
		var collider = collision.get_collider()

		if collider.is_in_group("door"):
			call_deferred("win_game")


# 🔥 FUNÇÃO DE VITÓRIA
func win_game():
	print("Você venceu!")
	if get_tree():
		get_tree().change_scene_to_file("res://gameHubEEtc/Menu/vitoria.tscn")
func shoot():
	print("ATIROU")

	var bullet = bullet_scene.instantiate()

	print("BALA:", bullet)

	bullet.global_position = $origemTiro.global_position
	bullet.global_rotation = global_rotation

	get_parent().add_child(bullet)





func dash():
	can_dash = false
	
	current_speed = boost_speed
	
	await get_tree().create_timer(0.3).timeout
	
	current_speed = normal_speed
	
	await get_tree().create_timer(2.0).timeout
	
	can_dash = true


func die():
	get_tree().reload_current_scene()
	
func _on_area_2d_body_entered(body):
	print("ENTROU:", body.name)

	if body.is_in_group("enemy"):
		print("ADICIONADO!")
		inimigos_no_cone.append(body)
		
func _on_area_2d_body_exited(body):
	print("SAIU:", body.name)

	if body.is_in_group("enemy"):
		inimigos_no_cone.erase(body)

		if body.has_node("Sprite2D"):
			body.get_node("Sprite2D").visible = false

		if body.has_node("Polygon2D"):
			body.get_node("Polygon2D").visible = false

		if body.has_node("PointLight2D"):
			body.get_node("PointLight2D").visible = false





func pode_ver(inimigo):

	var space = get_world_2d().direct_space_state

	var query = PhysicsRayQueryParameters2D.create(
		global_position,
		inimigo.global_position
	)

	query.exclude = [self]

	var resultado = space.intersect_ray(query)

	print("Resultado:", resultado)

	if resultado.is_empty():
		return true

	print("Colidiu com:", resultado.collider.name)

	return resultado.collider == inimigo
	
func _ready():
	for inimigo in get_tree().get_nodes_in_group("enemy"):
		print("Nome:", inimigo.name)

		if inimigo.has_node("Sprite2D"):
			inimigo.get_node("Sprite2D").visible = false
		else:
			print("NÃO TEM Sprite2D!")

		if inimigo.has_node("Polygon2D"):
			inimigo.get_node("Polygon2D").visible = false
		else:
			print("NÃO TEM Polygon2D!")

		if inimigo.has_node("PointLight2D"):
			inimigo.get_node("PointLight2D").visible = false
